import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RefreshService } from '@/services/refresh';

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a.padEnd(64));
  const bBuffer = Buffer.from(b.padEnd(64));
  return crypto.timingSafeEqual(aBuffer, bBuffer) && a.length === b.length;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!timingSafeEqual(authHeader || '', expected)) {
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
