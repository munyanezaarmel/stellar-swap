/**
 * __tests__/cache.test.ts
 *
 * Tests for our caching layer.
 * Caching saves API responses temporarily so we don't
 * hammer the Stellar Horizon API on every render.
 *
 * We test:
 * - Cache stores and retrieves values
 * - Cache expires after TTL (time-to-live)
 * - Cache invalidation works
 */

// ── Simple in-memory cache implementation ────────────────────────────────
// This is the cache we'll add to lib/cache.ts

interface CacheEntry<T> {
  value:     T;
  expiresAt: number; // timestamp in ms
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get a value from cache.
   * Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key); // clean up expired entry
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL in milliseconds.
   * Default TTL = 5 seconds (good for orderbook data)
   */
  set<T>(key: string, value: T, ttlMs: number = 5000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Manually invalidate (delete) a cache entry
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get number of entries (including expired ones not yet cleaned)
   */
  size(): number {
    return this.store.size;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Basic cache operations
// ═════════════════════════════════════════════════════════════════════════
describe("SimpleCache — basic operations", () => {
  let cache: SimpleCache;

  // Create a fresh cache before each test
  beforeEach(() => {
    cache = new SimpleCache();
  });

  test("stores and retrieves a value", () => {
    cache.set("key1", { price: "0.12345" });
    const result = cache.get<{ price: string }>("key1");
    expect(result).not.toBeNull();
    expect(result?.price).toBe("0.12345");
  });

  test("returns null for non-existent key", () => {
    const result = cache.get("nonexistent");
    expect(result).toBeNull();
  });

  test("stores different data types", () => {
    cache.set("string",  "hello");
    cache.set("number",  42);
    cache.set("boolean", true);
    cache.set("array",   [1, 2, 3]);
    cache.set("object",  { a: 1 });

    expect(cache.get("string")).toBe("hello");
    expect(cache.get("number")).toBe(42);
    expect(cache.get("boolean")).toBe(true);
    expect(cache.get("array")).toEqual([1, 2, 3]);
    expect(cache.get("object")).toEqual({ a: 1 });
  });

  test("overwrites existing value", () => {
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });

  test("has() returns true for existing key", () => {
    cache.set("key", "value");
    expect(cache.has("key")).toBe(true);
  });

  test("has() returns false for missing key", () => {
    expect(cache.has("missing")).toBe(false);
  });

  test("invalidate removes a key", () => {
    cache.set("key", "value");
    cache.invalidate("key");
    expect(cache.get("key")).toBeNull();
    expect(cache.has("key")).toBe(false);
  });

  test("clear removes all keys", () => {
    cache.set("key1", "val1");
    cache.set("key2", "val2");
    cache.set("key3", "val3");
    cache.clear();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
    expect(cache.size()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: TTL (Time To Live) expiration
// ═════════════════════════════════════════════════════════════════════════
describe("SimpleCache — TTL expiration", () => {
  let cache: SimpleCache;

  beforeEach(() => {
    cache = new SimpleCache();
  });

  test("value is available before TTL expires", () => {
    // Set with 1 second TTL
    cache.set("key", "value", 1000);
    // Immediately check — should still be there
    expect(cache.get("key")).toBe("value");
  });

  test("value expires after TTL", () => {
    // We use jest fake timers to simulate time passing
    // This avoids actually waiting in tests
    jest.useFakeTimers();

    cache.set("key", "value", 1000); // 1 second TTL

    // Advance time by 1001ms (past the TTL)
    jest.advanceTimersByTime(1001);

    expect(cache.get("key")).toBeNull();

    jest.useRealTimers();
  });

  test("value still valid just before TTL", () => {
    jest.useFakeTimers();

    cache.set("key", "value", 1000);

    // Advance time by 999ms (just before expiry)
    jest.advanceTimersByTime(999);

    expect(cache.get("key")).toBe("value");

    jest.useRealTimers();
  });

  test("expired entry is cleaned up on access", () => {
    jest.useFakeTimers();

    cache.set("key", "value", 500);
    jest.advanceTimersByTime(600);

    // Accessing expired key should return null AND remove it
    cache.get("key");
    expect(cache.size()).toBe(0);

    jest.useRealTimers();
  });

  test("default TTL is 5 seconds", () => {
    jest.useFakeTimers();

    cache.set("key", "value"); // no TTL specified → default 5s

    jest.advanceTimersByTime(4999); // just before 5s
    expect(cache.get("key")).toBe("value");

    jest.advanceTimersByTime(2); // now past 5s
    expect(cache.get("key")).toBeNull();

    jest.useRealTimers();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Cache with async data (simulates Horizon API caching)
// ═════════════════════════════════════════════════════════════════════════
describe("SimpleCache — async data pattern", () => {
  let cache: SimpleCache;
  let fetchCallCount: number;

  beforeEach(() => {
    cache          = new SimpleCache();
    fetchCallCount = 0;
  });

  // This simulates how we cache orderbook data
  async function getCachedOrderbook(): Promise<{ bestBid: string }> {
    const CACHE_KEY = "orderbook";
    const TTL_MS    = 5000;

    // Check cache first
    const cached = cache.get<{ bestBid: string }>(CACHE_KEY);
    if (cached) return cached;

    // Simulate API call
    fetchCallCount++;
    const data = { bestBid: "0.11234" };

    // Store in cache
    cache.set(CACHE_KEY, data, TTL_MS);
    return data;
  }

  test("fetches data on first call", async () => {
    const result = await getCachedOrderbook();
    expect(result.bestBid).toBe("0.11234");
    expect(fetchCallCount).toBe(1);
  });

  test("returns cached data on second call (no extra fetch)", async () => {
    await getCachedOrderbook(); // first call → fetches
    await getCachedOrderbook(); // second call → from cache
    await getCachedOrderbook(); // third call  → from cache

    // Should have only fetched ONCE
    expect(fetchCallCount).toBe(1);
  });

  test("re-fetches after cache expires", async () => {
    jest.useFakeTimers();

    await getCachedOrderbook(); // fetches → count = 1
    jest.advanceTimersByTime(6000); // expire the cache
    await getCachedOrderbook(); // fetches again → count = 2

    expect(fetchCallCount).toBe(2);

    jest.useRealTimers();
  });
});