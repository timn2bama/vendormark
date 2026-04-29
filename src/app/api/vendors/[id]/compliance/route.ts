import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GeminiService } from '@/services/gemini';
import { calculateRiskScore } from '@/lib/scoring';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 1. Parse with Gemini
    const parsedData = await GeminiService.parseComplianceDoc(buffer, file.type);

    if (!parsedData) {
      return NextResponse.json({ error: 'Failed to parse document with Gemini' }, { status: 500 });
    }

    // 2. Save to DB
    const doc = await prisma.complianceDoc.create({
      data: {
        vendorId: id,
        name: file.name,
        status: parsedData.status,
        parsedStatus: parsedData,
      },
    });

    // 3. Refresh Score
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

    return NextResponse.json({ success: true, doc, newScore: updatedVendor?.overallScore });
  } catch (error) {
    console.error('Compliance upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
