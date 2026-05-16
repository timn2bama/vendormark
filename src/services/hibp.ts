/**
 * Service to interact with HaveIBeenPwned API
 * Note: HIBP requires an API key for most endpoints.
 */

export interface HIBPBreach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  ModifiedDate: string;
  PwnCount: number;
  Description: string;
  LogoPath: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
  IsSubscriptionFree: boolean;
}

function domainsMatch(breachDomain: string, targetDomain: string): boolean {
  const normalize = (d: string) => d.toLowerCase().replace(/^www\./, '');
  const normalized = normalize(targetDomain);
  const breachNorm = normalize(breachDomain);
  return breachNorm === normalized || breachNorm.endsWith(`.${normalized}`);
}

export class HIBPService {
  private static BASE_URL = 'https://haveibeenpwned.com/api/v3';

  /**
   * Fetches all breaches from HIBP and filters for a specific domain.
   * In a production environment, you might want to cache the full breach list
   * as it changes infrequently (a few times a week).
   */
  static async getBreachesByDomain(domain: string): Promise<HIBPBreach[]> {
    const apiKey = process.env.HIBP_API_KEY;
    if (!apiKey) {
      console.warn('HIBP_API_KEY is not set. Skipping breach check.');
      return [];
    }

    try {
      // Fetch all breaches (this endpoint doesn't require a key but it's good practice to use one if available)
      const response = await fetch(`${this.BASE_URL}/breaches`, {
        headers: {
          'hibp-api-key': apiKey,
          'user-agent': 'VendorMark-Security-Scanner'
        }
      });

      if (!response.ok) {
        throw new Error(`HIBP API error: ${response.statusText}`);
      }

      const allBreaches: HIBPBreach[] = await response.json();
      
      // Filter breaches by domain using exact comparison to avoid false positives
      return allBreaches.filter(breach => domainsMatch(breach.Domain, domain));
    } catch (error) {
      console.error('Error fetching breaches from HIBP:', error);
      return [];
    }
  }
}
