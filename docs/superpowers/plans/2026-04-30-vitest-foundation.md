# Vitest Testing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup Vitest and implement unit/integration tests for business logic and security services.

**Architecture:**
- **Vitest**: Fast, Vite-native test runner.
- **Mocking**: Global `fetch` mocking and `vi.mock()` for service isolation.
- **Coverage**: Automated reporting using `v8`.

**Tech Stack:** `vitest`, `@vitest/coverage-v8`.

---

### Task 1: Setup & Configuration

**Files:**
- Modify: `VendorMark/package.json`
- Create: `VendorMark/vitest.config.ts`

- [ ] **Step 1: Install Vitest dependencies**
Run: `npm install -D vitest @vitest/coverage-v8` in `VendorMark` directory.

- [ ] **Step 2: Create `VendorMark/vitest.config.ts`**
Configure Vitest to work with Next.js aliases and set up coverage.

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**
Add the following to the `scripts` section:
- `"test": "vitest"`
- `"test:run": "vitest run"`
- `"test:coverage": "vitest run --coverage"`

---

### Task 2: Unit Testing Risk Scoring

**Files:**
- Create: `VendorMark/src/lib/scoring.test.ts`

- [ ] **Step 1: Implement scoring tests**
Test all branches of `calculateRiskScore`.

```typescript
import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from './scoring'

describe('calculateRiskScore', () => {
  it('returns 100 for no negative factors', () => {
    expect(calculateRiskScore([], [], [])).toBe(100)
  })

  it('penalties breaches by 15 points each', () => {
    const breaches = [{ id: '1' }] as any
    expect(calculateRiskScore(breaches, [], [])).toBe(85)
  })

  it('applies vulnerability severity penalties', () => {
    const vulns = [
      { severity: 'CRITICAL' },
      { severity: 'HIGH' },
      { severity: 'MEDIUM' },
      { severity: 'LOW' }
    ] as any
    // 100 - 10 - 7 - 4 - 1 = 78
    expect(calculateRiskScore([], vulns, [])).toBe(78)
  })

  it('clamps the score between 0 and 100', () => {
    const manyBreaches = Array(10).fill({ id: '1' }) as any
    expect(calculateRiskScore(manyBreaches, [], [])).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests and verify success**
Run: `npm test src/lib/scoring.test.ts`

---

### Task 3: Service Integration Tests (with Mocks)

**Files:**
- Create: `VendorMark/src/services/hibp.test.ts`

- [ ] **Step 1: Implement HIBP service tests**
Mock `fetch` and verify filtering logic.

```typescript
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
})
```

- [ ] **Step 2: Run tests and verify success**
Run: `npm test src/services/hibp.test.ts`
