/**
 * lib/cache.ts
 *
 * Simple in-memory cache to avoid hammering the Stellar Horizon API.
 *
 * WHY cache?
 * The orderbook refreshes every 5 seconds. Without caching, every
 * component that reads the orderbook would make a separate API call.
 * With caching, we make ONE call and share the result.
 *
 * Cache keys we use:
 * - "orderbook"          → XLM/USDC orderbook data (5s TTL)
 * - "stats"              → Contract swap stats (5s TTL)
 * - "balance:{address}"  → Account balances (10s TTL)
 * - "estimate:{amount}"  → Swap estimates (3s TTL)
 */

interface CacheEntry<T> {
  value:     T;
  expiresAt: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 5000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.store.size;
  }
}

// Export a single shared instance used across the whole app
export const appCache = new SimpleCache();

// TTL constants — easy to tune in one place
export const TTL = {
  ORDERBOOK: 5_000,   // 5 seconds
  STATS:     5_000,   // 5 seconds
  BALANCE:  10_000,   // 10 seconds
  ESTIMATE:  3_000,   // 3 seconds
};