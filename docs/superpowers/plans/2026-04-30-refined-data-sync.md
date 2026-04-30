# Refined Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement non-destructive, surgical updates for vendor security data to preserve historical records and metadata.

**Architecture:**
- **Identity-based Sync**: Using `externalId` (HIBP) and `cveId` (NVD) as unique anchors per vendor.
- **Upsert Strategy**: Leveraging Prisma's `upsert` or conditional creation to avoid duplicates and deletions.
- **Transaction Safety**: Wrapping the refresh cycle in a DB transaction for atomicity.

**Tech Stack:** `Prisma`, `Next.js App Router`.

---

### Task 1: Schema Hardening

**Files:**
- Modify: `VendorMark/prisma/schema.prisma`

- [ ] **Step 1: Add identifiers and unique constraints to `BreachRecord` and `Vulnerability`**
Add the `externalId` field to `BreachRecord` and define compound unique constraints for both models.

```prisma
model BreachRecord {
  id          String   @id @default(cuid())
  externalId  String?  // HIBP Name (unique anchor)
  vendorId    String
  vendor      Vendor   @relation(fields: [vendorId], references: [id])
  description String
  date        DateTime
  createdAt   DateTime @default(now())

  @@unique([vendorId, externalId])
}

model Vulnerability {
  id          String   @id @default(cuid())
  vendorId    String
  vendor      Vendor   @relation(fields: [vendorId], references: [id])
  cveId       String
  severity    String
  description String?
  createdAt   DateTime @default(now())

  @@unique([vendorId, cveId])
}
```

- [ ] **Step 2: Run Prisma migration**
Run: `npx prisma migrate dev --name hardening_sync_identifiers`

---

### Task 2: Surgical Refresh Implementation

**Files:**
- Modify: `VendorMark/src/app/api/vendors/[id]/refresh/route.ts`

- [ ] **Step 1: Refactor the POST handler to use surgical updates**
Replace `deleteMany` -> `createMany` with a series of `upsert` or conditional creation calls within a transaction.

```typescript
// For Breaches:
for (const b of hibpBreaches) {
  await prisma.breachRecord.upsert({
    where: { 
      vendorId_externalId: { vendorId: id, externalId: b.Name } 
    },
    update: {}, // Preserve existing data
    create: {
      vendorId: id,
      externalId: b.Name,
      description: `${b.Title}: ${b.Description.substring(0, 200)}...`,
      date: new Date(b.BreachDate.toString()),
    }
  });
}

// For Vulnerabilities:
for (const v of uniqueVulns) {
  await prisma.vulnerability.upsert({
    where: {
      vendorId_cveId: { vendorId: id, cveId: v.cveId }
    },
    update: {
      severity: v.severity, // Update severity if it changed
      description: v.description,
    },
    create: {
      vendorId: id,
      cveId: v.cveId,
      severity: v.severity,
      description: v.description,
    }
  });
}
```

- [ ] **Step 2: Verify the build**
Run: `npm run build`

---

### Task 3: Integration Verification

**Files:**
- Create: `VendorMark/src/app/api/vendors/[id]/refresh/refresh.test.ts`

- [ ] **Step 1: Implement a test to verify surgical sync**
Mock the services to return the same data twice and verify that no duplicate records are created and no records are deleted.

```typescript
import { describe, it, expect, vi } from 'vitest'
// ... (Setup mocks for HIBPService and CVEService)
// Verify that after two refreshes, count remains stable.
```

- [ ] **Step 2: Run tests**
Run: `npm test refresh.test.ts`
