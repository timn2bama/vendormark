export class TechnologyService {
  static async detectTech(domain: string): Promise<string[]> {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      // Use short timeout to avoid hanging the creation flow
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const headers = response.headers;
      const html = await response.text();
      const tech = new Set<string>();

      // Header Analysis
      const server = headers.get('server');
      const poweredBy = headers.get('x-powered-by');
      if (server) tech.add(server);
      if (poweredBy) tech.add(poweredBy);

      // Signature Analysis (Basic strings for MVP)
      if (html.includes('wp-content')) tech.add('WordPress');
      if (html.includes('_next/static')) tech.add('Next.js');
      if (html.includes('reactroot')) tech.add('React');

      return Array.from(tech);
    } catch (e) {
      console.warn(`Tech detection failed for ${domain}`, e);
      return [];
    }
  }
}
