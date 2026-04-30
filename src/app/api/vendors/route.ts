import { auth } from "@/auth"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, domain } = await request.json();

    if (!name || !domain) {
      return NextResponse.json({ error: 'Name and Domain are required' }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        domain,
        userId: session.user.id,
        overallScore: 100,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Vendor creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
