import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { RefreshService } from '@/services/refresh';

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
    const updatedVendor = await RefreshService.refresh(id);
    return NextResponse.json({ success: true, newScore: updatedVendor.overallScore });
  } catch (error) {
    console.error('Refresh error:', error);
    if (error instanceof Error && error.message === 'Vendor not found') {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to refresh vendor data' }, { status: 500 });
  }
}
