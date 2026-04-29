/**
 * Service to interact with National Vulnerability Database (NVD) API
 */

export interface VulnerabilityData {
  cveId: string;
  severity: string;
  description: string;
  published: string;
}

export class CVEService {
  private static API_KEY = process.env.NVD_API_KEY;
  private static BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

  /**
   * Fetches vulnerabilities from NVD based on a keyword (vendor name or tech stack item).
   */
  static async getVulnerabilitiesByKeyword(keyword: string): Promise<VulnerabilityData[]> {
    try {
      const url = `${this.BASE_URL}?keywordSearch=${encodeURIComponent(keyword)}`;
      const headers: Record<string, string> = {};
      
      if (this.API_KEY) {
        headers['apiKey'] = this.API_KEY;
      }

      const response = await fetch(url, { headers });

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
    }
  }
}
