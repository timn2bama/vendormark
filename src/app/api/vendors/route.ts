import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, domain } = await request.json();

    if (!name || !domain) {
      return NextResponse.json({ error: 'Name and Domain are required' }, { status: 400 });
    }

    // In a real app, we'd get the userId from auth
    // For MVP, we'll use a hardcoded user or create one if none exists
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'founder@example.com',
          name: 'Founder',
        }
      });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        domain,
        userId: user.id,
        overallScore: 100, // Initial perfect score
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Vendor creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
