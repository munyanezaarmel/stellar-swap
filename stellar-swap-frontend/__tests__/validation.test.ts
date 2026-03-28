/**
 * __tests__/validation.test.ts
 *
 * Tests for swap input validation logic.
 * These test the BUSINESS RULES of our swap form:
 * - Minimum amounts
 * - Balance checks
 * - Address validation
 *
 * No mocking needed — pure logic tests.
 */

// ── Helper functions we'll test ───────────────────────────────────────────
// These mirror the validation logic inside SwapCard.tsx

function validateSwapAmount(
  xlmAmount: string,
  xlmBalance: string
): { valid: boolean; error?: string } {
  const amount  = parseFloat(xlmAmount);
  const balance = parseFloat(xlmBalance);

  // Must be a number
  if (!xlmAmount || isNaN(amount)) {
    return { valid: false, error: "Please enter a valid amount" };
  }

  // Must be positive
  if (amount <= 0) {
    return { valid: false, error: "Please enter a valid amount" };
  }

  // Must be at least 1 XLM (contract requirement)
  if (amount < 1) {
    return { valid: false, error: "Minimum swap is 1 XLM" };
  }

  // Keep 1 XLM for fees
  if (amount > balance - 1) {
    return { valid: false, error: "Insufficient XLM balance (keep at least 1 XLM for fees)" };
  }

  return { valid: true };
}

function calculateMinUsdcOut(usdcEstimate: string, slippagePct: number): string {
  const est = parseFloat(usdcEstimate);
  if (isNaN(est) || est <= 0) return "0";
  return (est * (1 - slippagePct / 100)).toFixed(6);
}

function calculateTokenAmount(xlmAmount: number, rate: number): number {
  return Math.floor(xlmAmount) * rate;
}

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Swap amount validation
// ═════════════════════════════════════════════════════════════════════════
describe("validateSwapAmount", () => {
  test("accepts valid amount with sufficient balance", () => {
    const result = validateSwapAmount("10", "100");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("rejects empty string", () => {
    const result = validateSwapAmount("", "100");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("rejects zero amount", () => {
    const result = validateSwapAmount("0", "100");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("rejects negative amount", () => {
    const result = validateSwapAmount("-5", "100");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("rejects amount below 1 XLM minimum", () => {
    const result = validateSwapAmount("0.5", "100");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum");
  });

  test("rejects amount that exceeds balance minus fee reserve", () => {
    // Balance is 10 XLM, trying to swap 10 — need to keep 1 for fees
    const result = validateSwapAmount("10", "10");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Insufficient");
  });

  test("accepts amount exactly at balance minus 1 XLM fee reserve", () => {
    // Balance 10, swap 9 — leaves 1 for fees ✅
    const result = validateSwapAmount("9", "10");
    expect(result.valid).toBe(true);
  });

  test("rejects non-numeric string", () => {
    const result = validateSwapAmount("abc", "100");
    expect(result.valid).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Slippage calculation
// ═════════════════════════════════════════════════════════════════════════
describe("calculateMinUsdcOut", () => {
  test("calculates 0.5% slippage correctly", () => {
    // 100 USDC with 0.5% slippage = 99.5 USDC minimum
    const result = calculateMinUsdcOut("100", 0.5);
    expect(parseFloat(result)).toBeCloseTo(99.5, 4);
  });

  test("calculates 1% slippage correctly", () => {
    const result = calculateMinUsdcOut("50", 1);
    expect(parseFloat(result)).toBeCloseTo(49.5, 4);
  });

  test("returns 0 for invalid estimate", () => {
    expect(calculateMinUsdcOut("0", 0.5)).toBe("0");
    expect(calculateMinUsdcOut("abc", 0.5)).toBe("0");
    expect(calculateMinUsdcOut("-1", 0.5)).toBe("0");
  });

  test("0% slippage returns same amount", () => {
    const result = calculateMinUsdcOut("100", 0);
    expect(parseFloat(result)).toBeCloseTo(100, 4);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Token amount calculation
// ═════════════════════════════════════════════════════════════════════════
describe("calculateTokenAmount", () => {
  test("5 XLM at rate 100 = 500 tokens", () => {
    expect(calculateTokenAmount(5, 100)).toBe(500);
  });

  test("1 XLM at rate 100 = 100 tokens", () => {
    expect(calculateTokenAmount(1, 100)).toBe(100);
  });

  test("floors decimal XLM amounts", () => {
    // 5.7 XLM → floor to 5 → 500 tokens
    expect(calculateTokenAmount(5.7, 100)).toBe(500);
  });

  test("0 XLM = 0 tokens", () => {
    expect(calculateTokenAmount(0, 100)).toBe(0);
  });
});