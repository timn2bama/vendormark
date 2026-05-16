import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth before importing route
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    vendor: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    breachRecord: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    vulnerability: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback: any) => {
      const { prisma } = require('@/lib/db')
      return callback(prisma)
    }),
  },
}))

vi.mock('@/services/refresh', () => ({
  RefreshService: {
    refresh: vi.fn(),
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { POST } from '@/app/api/vendors/[id]/refresh/route'

describe('Refresh route — auth & ownership', () => {
  const vendorId = 'vendor-abc'
  const ownerId = 'user-owner'
  const otherUserId = 'user-other'

  const makeRequest = (id: string) =>
    new NextRequest(`http://localhost/api/vendors/${id}/refresh`, { method: 'POST' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session exists', async () => {
    ;(auth as any).mockResolvedValue(null)

    const response = await POST(makeRequest(vendorId), {
      params: Promise.resolve({ id: vendorId }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no user id', async () => {
    ;(auth as any).mockResolvedValue({ user: {} })

    const response = await POST(makeRequest(vendorId), {
      params: Promise.resolve({ id: vendorId }),
    })

    expect(response.status).toBe(401)
  })

  it('returns 404 when vendor does not exist', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: ownerId } })
    ;(prisma.vendor.findUnique as any).mockResolvedValue(null)

    const response = await POST(makeRequest(vendorId), {
      params: Promise.resolve({ id: vendorId }),
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Vendor not found')
  })

  it('returns 403 when authenticated user does not own the vendor', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: otherUserId } })
    ;(prisma.vendor.findUnique as any).mockResolvedValue({ userId: ownerId })

    const response = await POST(makeRequest(vendorId), {
      params: Promise.resolve({ id: vendorId }),
    })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 when authenticated user owns the vendor', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: ownerId } })
    ;(prisma.vendor.findUnique as any).mockResolvedValue({ userId: ownerId })

    const { RefreshService } = await import('@/services/refresh')
    ;(RefreshService.refresh as any).mockResolvedValue({ overallScore: 85 })

    const response = await POST(makeRequest(vendorId), {
      params: Promise.resolve({ id: vendorId }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })
})
