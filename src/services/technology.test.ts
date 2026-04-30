import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TechnologyService } from './technology'

describe('TechnologyService', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('detects WordPress from HTML signature', async () => {
    (global.fetch as any).mockResolvedValue({
      headers: { get: () => null },
      text: async () => '<html><body><script src="/wp-content/themes/twentytwentyone/style.css"></script></body></html>'
    })

    const tech = await TechnologyService.detectTech('example.com')
    expect(tech).toContain('WordPress')
  })

  it('detects Next.js from HTML signature', async () => {
    (global.fetch as any).mockResolvedValue({
      headers: { get: () => null },
      text: async () => '<html><body><script src="/_next/static/chunks/main.js"></script></body></html>'
    })

    const tech = await TechnologyService.detectTech('example.com')
    expect(tech).toContain('Next.js')
  })

  it('detects server technology from headers', async () => {
    const mockHeaders = {
      get: (name: string) => {
        if (name === 'server') return 'nginx'
        if (name === 'x-powered-by') return 'PHP/8.1'
        return null
      }
    };

    (global.fetch as any).mockResolvedValue({
      headers: mockHeaders,
      text: async () => '<html></html>'
    })

    const tech = await TechnologyService.detectTech('example.com')
    expect(tech).toContain('nginx')
    expect(tech).toContain('PHP/8.1')
  })

  it('handles fetch failure gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'))

    const tech = await TechnologyService.detectTech('example.com')
    expect(tech).toEqual([])
  })
})
