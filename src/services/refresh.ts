import { prisma } from '@/lib/db';
import { HIBPService } from '@/services/hibp';
import { CVEService } from '@/services/cve';
import { calculateRiskScore } from '@/lib/scoring';

export class RefreshService {
  static async refresh(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        breaches: true,
        vulnerabilities: true,
        complianceDocs: true,
      },
    });

    if (!vendor) throw new Error('Vendor not found');

    // 1. Fetch Breaches
    const hibpBreaches = await HIBPService.getBreachesByDomain(vendor.domain);
    
    // 2. Fetch Vulnerabilities for Vendor and Tech Stack
    const techStackKeywords = [vendor.name, ...vendor.techStack];
    const allVulns: any[] = [];

    for (const keyword of techStackKeywords) {
      const vulns = await CVEService.getVulnerabilitiesByKeyword(keyword);
      allVulns.push(...vulns);
    }

    // Remove duplicates and limit for MVP
    const uniqueVulns = Array.from(new Set(allVulns.map(v => v.cveId)))
      .map(cveId => allVulns.find(v => v.cveId === cveId))
      .filter(Boolean)
      .slice(0, 50);

    const updatedVendor = await prisma.$transaction(async (tx) => {
      // 1. Surgical Refresh for Breaches
      for (const b of hibpBreaches) {
        await tx.breachRecord.upsert({
          where: { 
            vendorId_externalId: { vendorId, externalId: b.Name } 
          },
          update: {}, // Preserve existing data if it exists
          create: {
            vendorId,
            externalId: b.Name,
            description: `${b.Title}: ${b.Description.substring(0, 200)}...`,
            date: new Date(b.BreachDate.toString()),
          }
        });
      }

      // 2. Surgical Refresh for Vulnerabilities
      for (const v of uniqueVulns) {
        if (!v) continue;
        await tx.vulnerability.upsert({
          where: {
            vendorId_cveId: { vendorId, cveId: v.cveId }
          },
          update: {
            severity: v.severity,
            description: v.description,
          },
          create: {
            vendorId,
            cveId: v.cveId,
            severity: v.severity,
            description: v.description,
          }
        });
      }

      // 3. Recalculate Score within the transaction
      const currentVendor = await tx.vendor.findUnique({
        where: { id: vendorId },
        include: {
          breaches: true,
          vulnerabilities: true,
          complianceDocs: true,
        },
      });

      if (!currentVendor) throw new Error('Vendor lost during transaction');

      const newScore = calculateRiskScore(
        currentVendor.breaches,
        currentVendor.vulnerabilities,
        currentVendor.complianceDocs
      );

      return await tx.vendor.update({
        where: { id: vendorId },
        data: { overallScore: newScore },
      });
    });

    return updatedVendor;
  }
}
