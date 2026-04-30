import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { POST } from './route'
import { HIBPService } from '@/services/hibp'
import { CVEService } from '@/services/cve'
import { NextRequest } from 'next/server'

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
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}))

vi.mock('@/services/hibp')
vi.mock('@/services/cve')
vi.mock('@/lib/scoring', () => ({
  calculateRiskScore: vi.fn(() => 75),
}))

describe('Refresh API Surgical Sync', () => {
  const mockVendorId = 'test-vendor-id'
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('performs surgical updates without deleting data', async () => {
    const mockVendor = {
      id: mockVendorId,
      name: 'Test Vendor',
      domain: 'test.com',
      techStack: [],
      breaches: [],
      vulnerabilities: [],
      complianceDocs: [],
    };

    (prisma.vendor.findUnique as any).mockResolvedValue(mockVendor);
    (HIBPService.getBreachesByDomain as any).mockResolvedValue([
      { Name: 'Breach1', Title: 'Title1', Description: 'Desc1', BreachDate: '2023-01-01' }
    ]);
    (CVEService.getVulnerabilitiesByKeyword as any).mockResolvedValue([
      { cveId: 'CVE-1', severity: 'HIGH', description: 'Desc1' }
    ]);
    (prisma.vendor.update as any).mockResolvedValue({ ...mockVendor, overallScore: 75 });

    const req = new NextRequest(`http://localhost/api/vendors/${mockVendorId}/refresh`, {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ id: mockVendorId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify upsert was called for Breach
    expect(prisma.breachRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendorId_externalId: { vendorId: mockVendorId, externalId: 'Breach1' } },
        update: {},
        create: expect.objectContaining({
          vendorId: mockVendorId,
          externalId: 'Breach1',
        })
      })
    )

    // Verify upsert was called for Vulnerability
    expect(prisma.vulnerability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendorId_cveId: { vendorId: mockVendorId, cveId: 'CVE-1' } },
        update: {
          severity: 'HIGH',
          description: 'Desc1',
        },
        create: expect.objectContaining({
          vendorId: mockVendorId,
          cveId: 'CVE-1',
        })
      })
    )

    // Verify that NO deletion calls were made
    expect(prisma.breachRecord.deleteMany).not.toHaveBeenCalled()
    expect(prisma.vulnerability.deleteMany).not.toHaveBeenCalled()
  })
})
