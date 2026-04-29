import { BreachRecord, Vulnerability, ComplianceDoc } from '@prisma/client';

export function calculateRiskScore(
  breaches: BreachRecord[],
  vulnerabilities: Vulnerability[],
  complianceDocs: ComplianceDoc[]
): number {
  let score = 100;

  // Breach Penalties (High Impact)
  // Each breach reduces the score. Recent breaches could hurt more.
  breaches.forEach(breach => {
    score -= 15; // flat penalty for now
  });

  // Vulnerability Penalties (Medium Impact)
  vulnerabilities.forEach(vuln => {
    switch (vuln.severity.toUpperCase()) {
      case 'CRITICAL':
        score -= 10;
        break;
      case 'HIGH':
        score -= 7;
        break;
      case 'MEDIUM':
        score -= 4;
        break;
      case 'LOW':
        score -= 1;
        break;
    }
  });

  // Compliance Penalties (Variable Impact)
  complianceDocs.forEach(doc => {
    if (doc.status === 'Gaps Identified') {
      score -= 20;
    } else if (doc.status === 'Expired') {
      score -= 25;
    }
  });

  // Ensure score stays within 0-100
  return Math.max(0, Math.min(100, score));
}
