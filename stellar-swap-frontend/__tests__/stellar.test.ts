/**
 * __tests__/stellar.test.ts
 *
 * Tests for our Stellar utility functions in lib/stellar.ts
 * These are UNIT tests — they test one function at a time in isolation.
 *
 * We MOCK the Stellar SDK calls so tests don't hit the real network.
 * This makes tests fast and reliable (no internet needed).
 */

// ── Mock the Stellar SDK before importing our lib ─────────────────────────
// Jest replaces these with fake versions that we control
jest.mock("@stellar/stellar-sdk", () => ({
  Networks: {
    TESTNET: "Test SDF Network ; September 2015",
  },
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
      orderbook:   jest.fn(),
      strictSendPaths: jest.fn(),
    })),
  },
  rpc: {
    Server: jest.fn().mockImplementation(() => ({})),
    Api: {
      isSimulationSuccess: jest.fn(),
    },
    assembleTransaction: jest.fn(),
  },
 Asset: Object.assign(
  jest.fn().mockImplementation((code, issuer) => ({
    code,
    issuer,
    isNative: () => false,
  })),
  {
    native: jest.fn(() => ({
      isNative: () => true,
    })),
  }
),
  TransactionBuilder: jest.fn(),
  Operation:          { pathPaymentStrictSend: jest.fn(), changeTrust: jest.fn() },
  BASE_FEE:           "100",
  Contract:           jest.fn(),
  nativeToScVal:      jest.fn(),
}));

// ── Import the functions we want to test ─────────────────────────────────
import {
  formatXlm,
  shortenAddress,
  getExplorerTxUrl,
  getExplorerAccountUrl,
} from "../lib/stellar";

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: formatXlm
// formatXlm converts stroops to XLM (divide by 10,000,000)
// ═════════════════════════════════════════════════════════════════════════
describe("formatXlm", () => {
  test("converts stroops to XLM correctly", () => {
    // 10,000,000 stroops = 1 XLM
    expect(formatXlm(10_000_000)).toBe("1.00");
  });

  test("converts 50,000,000 stroops to 5 XLM", () => {
    expect(formatXlm(50_000_000)).toBe("5.00");
  });

  test("handles string input", () => {
    expect(formatXlm("100000000")).toBe("10.00");
  });

  test("handles zero", () => {
    expect(formatXlm(0)).toBe("0.00");
  });

  test("handles large amounts", () => {
    // 10,000 XLM = 100,000,000,000 stroops
    expect(formatXlm(100_000_000_000)).toBe("10000.00");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: shortenAddress
// shortenAddress shortens a Stellar address for display
// ═════════════════════════════════════════════════════════════════════════
describe("shortenAddress", () => {
  const fullAddress = "GBKTBTPLCH6FLRWBV3PAM2QF3FGNR5O6CI2UX6FMK4CMKIIIXCYAFWHD";

  test("shortens a full Stellar address", () => {
    const result = shortenAddress(fullAddress);
    expect(result).toBe("GBKTBT...YAFWHD");
  });

  test("shows first and last N chars", () => {
    const result = shortenAddress(fullAddress, 4);
    expect(result).toContain("GBKT");
    expect(result).toContain("FWHD");
    expect(result).toContain("...");
  });

  test("returns short address unchanged", () => {
    const short = "GABC";
    expect(shortenAddress(short, 6)).toBe(short);
  });

  test("default chars is 6", () => {
    const result = shortenAddress(fullAddress);
    const parts  = result.split("...");
    expect(parts[0].length).toBe(6);
    expect(parts[1].length).toBe(6);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Explorer URL generators
// ═════════════════════════════════════════════════════════════════════════
describe("Explorer URL helpers", () => {
  test("getExplorerTxUrl returns correct testnet URL", () => {
    const hash = "abc123def456";
    const url  = getExplorerTxUrl(hash);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${hash}`);
  });

  test("getExplorerAccountUrl returns correct testnet URL", () => {
    const addr = "GBKTBTPLCH6FLRWBV3PAM2QF3FGNR5O6CI2UX6FMK4CMKIIIXCYAFWHD";
    const url  = getExplorerAccountUrl(addr);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${addr}`);
  });

  test("URLs contain testnet (not mainnet)", () => {
    expect(getExplorerTxUrl("abc")).toContain("testnet");
    expect(getExplorerAccountUrl("GABC")).toContain("testnet");
  });
});