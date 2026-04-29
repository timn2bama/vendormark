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
    
    // Clear old breaches and add new ones (Surgical update would be better, but this is an MVP)
    await prisma.breachRecord.deleteMany({ where: { vendorId: id } });
    await prisma.breachRecord.createMany({
      data: hibpBreaches.map(b => ({
        vendorId: id,
        description: `${b.Title}: ${b.Description.substring(0, 200)}...`,
        date: new Date(b.BreachDate.toString()),
      })),
    });

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

    await prisma.vulnerability.deleteMany({ where: { vendorId: id } });
    await prisma.vulnerability.createMany({
      data: uniqueVulns.map(v => ({
        vendorId: id,
        cveId: v!.cveId,
        severity: v!.severity,
        description: v!.description,
      })),
    });

    // 3. Recalculate Score
    const updatedVendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        breaches: true,
        vulnerabilities: true,
        complianceDocs: true,
      },
    });

    if (updatedVendor) {
      const newScore = calculateRiskScore(
        updatedVendor.breaches,
        updatedVendor.vulnerabilities,
        updatedVendor.complianceDocs
      );

      await prisma.vendor.update({
        where: { id },
        data: { overallScore: newScore },
      });
    }

    return NextResponse.json({ success: true, newScore: updatedVendor?.overallScore });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh vendor data' }, { status: 500 });
  }
}
