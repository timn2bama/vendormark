import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RefreshService } from '@/services/refresh';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vendors = await prisma.vendor.findMany({ select: { id: true } });
  
  // Refresh vendors in parallel batches or sequentially for safety
  for (const vendor of vendors) {
    try {
      await RefreshService.refresh(vendor.id);
    } catch (e) {
      console.error(`Cron refresh failed for vendor ${vendor.id}:`, e);
    }
  }

  return NextResponse.json({ success: true, count: vendors.length });
}
