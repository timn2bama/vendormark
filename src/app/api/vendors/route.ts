import { auth } from "@/auth"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TechnologyService } from '@/services/technology';
import { z } from 'zod';

const createVendorSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain format'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }
    const { name, domain } = parsed.data;

    // Detect technologies
    const techStack = await TechnologyService.detectTech(domain);

    const vendor = await prisma.vendor.create({
      data: {
        name,
        domain,
        userId: session.user.id,
        overallScore: 100,
        techStack: techStack,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Vendor creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
