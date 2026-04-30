import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HIBPService } from './hibp'

describe('HIBPService', () => {
  beforeEach(() => {
    vi.stubEnv('HIBP_API_KEY', 'test-key')
    global.fetch = vi.fn()
  })

  it('filters breaches by domain correctly', async () => {
    const mockBreaches = [
      { Domain: 'adobe.com', Name: 'Adobe' },
      { Domain: 'canva.com', Name: 'Canva' }
    ];
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockBreaches
    })

    const result = await HIBPService.getBreachesByDomain('adobe.com')
    expect(result).toHaveLength(1)
    expect(result[0].Name).toBe('Adobe')
  })

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error'
    })

    const result = await HIBPService.getBreachesByDomain('test.com')
    expect(result).toEqual([])
  })
})
