# Production-Ready Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded user logic with real authentication using Auth.js (NextAuth.js v5).

**Architecture:**
- **NextAuth.js v5:** Leveraging the latest App Router patterns and React 19 compatibility.
- **Prisma Adapter:** Persisting users, accounts, and sessions in PostgreSQL.
- **Middleware Protection:** Global route protection for authenticated paths.

**Tech Stack:** `next-auth@beta`, `@auth/prisma-adapter`, `Prisma`, `Next.js 16`.

---

### Task 1: Dependencies & Schema Update

**Files:**
- Modify: `VendorMark/package.json`
- Modify: `VendorMark/prisma/schema.prisma`

- [ ] **Step 1: Install Auth.js dependencies**
Run: `npm install next-auth@beta @auth/prisma-adapter` in `VendorMark` directory.

- [ ] **Step 2: Update `VendorMark/prisma/schema.prisma`**
Update the `User` model and add `Account`, `Session`, and `VerificationToken`.

```prisma
model User {
  id            String          @id @default(cuid())
  name          String?
  email         String          @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  vendors       Vendor[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
 
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
 
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
 
  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
 
  @@id([identifier, token])
}
```

- [ ] **Step 3: Run Prisma migration**
Run: `npx prisma migrate dev --name add_auth_models`

---

### Task 2: Auth Configuration

**Files:**
- Create: `VendorMark/src/auth.ts`
- Create: `VendorMark/src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create `VendorMark/src/auth.ts`**
Configure the adapter and providers.

```typescript
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import Google from "next-auth/providers/google"
 
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
})
```

- [ ] **Step 2: Create Auth API Route `VendorMark/src/app/api/auth/[...nextauth]/route.ts`**
Export the GET/POST handlers.

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

---

### Task 3: Route Protection & Middleware

**Files:**
- Create: `VendorMark/src/middleware.ts`
- Modify: `VendorMark/src/app/api/vendors/route.ts`

- [ ] **Step 1: Create `VendorMark/src/middleware.ts`**
Protect all routes except the landing page and public assets.

```typescript
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 2: Update `VendorMark/src/app/api/vendors/route.ts` to use real session**
Extract `userId` from the `auth()` session.

```typescript
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
```

---

### Task 4: UI Integration

**Files:**
- Modify: `VendorMark/src/app/page.tsx`

- [ ] **Step 1: Add Auth conditional rendering to Dashboard**
Import `auth`, `signIn`, and `signOut` to show a login screen or the dashboard.

```typescript
import { auth, signIn, signOut } from "@/auth"
// ... inside component
const session = await auth()
if (!session) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Welcome to VendorMark</h1>
      <form action={async () => { "use server"; await signIn("google") }}>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Sign In with Google</button>
      </form>
    </div>
  )
}
// ... rest of dashboard with Sign Out button
```
