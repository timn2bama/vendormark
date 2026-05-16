/**
 * Service to interact with National Vulnerability Database (NVD) API
 */

export interface VulnerabilityData {
  cveId: string;
  severity: string;
  description: string;
  published: string;
}

const RATE_LIMIT_MS = 6000; // NVD allows ~10 req/min without API key
const REQUEST_TIMEOUT_MS = 10000; // 10-second timeout per request
const MAX_KEYWORDS = 10;

async function fetchWithDelay<T>(tasks: (() => Promise<T>)[], delayMs: number): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}

export class CVEService {
  private static API_KEY = process.env.NVD_API_KEY;
  private static BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

  /**
   * Fetches vulnerabilities from NVD based on a keyword (vendor name or tech stack item).
   */
  static async getVulnerabilitiesByKeyword(keyword: string): Promise<VulnerabilityData[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = `${this.BASE_URL}?keywordSearch=${encodeURIComponent(keyword)}`;
      const headers: Record<string, string> = {};

      if (this.API_KEY) {
        headers['apiKey'] = this.API_KEY;
      }

      const response = await fetch(url, { headers, signal: controller.signal });

      if (response.status === 429) {
        console.warn(`NVD API rate limit hit for keyword "${keyword}". Skipping.`);
        return [];
      }

      if (!response.ok) {
        throw new Error(`NVD API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse NVD 2.0 response format
      return (data.vulnerabilities || []).map((vuln: any) => {
        const cve = vuln.cve;
        const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
        const severity = metrics?.cvssData?.baseSeverity || 'UNKNOWN';
        const description = cve.descriptions.find((d: any) => d.lang === 'en')?.value || 'No description available.';

        return {
          cveId: cve.id,
          severity,
          description,
          published: cve.published
        };
      });
    } catch (error) {
      console.error(`Error fetching vulnerabilities for ${keyword}:`, error);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches vulnerabilities for multiple keywords with rate limiting.
   * Limits to MAX_KEYWORDS items to avoid hammering the NVD API.
   */
  static async getVulnerabilitiesForKeywords(keywords: string[]): Promise<VulnerabilityData[]> {
    const limited = keywords.slice(0, MAX_KEYWORDS);
    const tasks = limited.map(keyword => () => this.getVulnerabilitiesByKeyword(keyword));
    const results = await fetchWithDelay(tasks, RATE_LIMIT_MS);
    return results.flat();
  }
}
