import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { HIBPService } from '@/services/hibp';
import { CVEService } from '@/services/cve';
import { calculateRiskScore } from '@/lib/scoring';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        breaches: true,
        vulnerabilities: true,
        complianceDocs: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

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
      .slice(0, 50);

    const updatedVendor = await prisma.$transaction(async (tx) => {
      // 1. Surgical Refresh for Breaches
      for (const b of hibpBreaches) {
        await tx.breachRecord.upsert({
          where: { 
            vendorId_externalId: { vendorId: id, externalId: b.Name } 
          },
          update: {}, // Preserve existing data if it exists
          create: {
            vendorId: id,
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
            vendorId_cveId: { vendorId: id, cveId: v.cveId }
          },
          update: {
            severity: v.severity,
            description: v.description,
          },
          create: {
            vendorId: id,
            cveId: v.cveId,
            severity: v.severity,
            description: v.description,
          }
        });
      }

      // 3. Recalculate Score within the transaction
      const currentVendor = await tx.vendor.findUnique({
        where: { id },
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
        where: { id },
        data: { overallScore: newScore },
      });
    });

    return NextResponse.json({ success: true, newScore: updatedVendor.overallScore });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh vendor data' }, { status: 500 });
  }
}
