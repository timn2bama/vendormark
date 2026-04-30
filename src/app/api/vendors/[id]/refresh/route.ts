import { NextRequest, NextResponse } from 'next/server';
import { RefreshService } from '@/services/refresh';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
