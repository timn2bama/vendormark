import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GeminiService } from '@/services/gemini';
import { calculateRiskScore } from '@/lib/scoring';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({ where: { id }, select: { userId: true } });
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }
  if (vendor.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 413 });
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
