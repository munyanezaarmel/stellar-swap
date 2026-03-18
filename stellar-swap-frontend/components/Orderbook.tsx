"use client";
/**
 * components/Orderbook.tsx
 *
 * Shows live XLM/USDC orderbook from the Stellar DEX.
 * Refreshes every 5 seconds automatically.
 *
 * Bids  = people want to BUY  XLM (paying USDC)
 * Asks  = people want to SELL XLM (receiving USDC)
 */

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { fetchOrderbook, type OrderbookData } from "@/lib/stellar";

export default function Orderbook() {
  const [data, setData]         = useState<OrderbookData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function load() {
    const ob = await fetchOrderbook();
    setData(ob);
    setLastUpdate(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Auto-refresh every 5 seconds — this is the "real-time" requirement
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 className="mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            DEX Orderbook
          </h3>
          <p style={{ fontSize: "0.65rem", color: "#475569" }}>XLM / USDC · Live</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {lastUpdate && (
            <span style={{ fontSize: "0.6rem", color: "#334155" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <RefreshCw size={12} style={{ color: "#475569" }} className={loading ? "animate-spin" : ""} />
        </div>
      </div>

      {loading && !data ? (
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shimmer" style={{ height: "1.5rem" }} />
          ))}
        </div>
      ) : (
        <div style={{ padding: "0.875rem 1.25rem" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {["Price (USDC)", "Amount (XLM)", "Side"].map(h => (
              <span key={h} className="mono" style={{ fontSize: "0.6rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

          {/* Asks (sells) — red */}
          {[...(data?.asks ?? [])].reverse().map((ask, i) => (
            <div key={`ask-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid rgba(26,48,80,0.3)" }}>
              <span className="mono" style={{ fontSize: "0.72rem", color: "#f87171" }}>{ask.price}</span>
              <span className="mono" style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{ask.amount}</span>
              <span className="mono" style={{ fontSize: "0.65rem", color: "#f87171" }}>SELL</span>
            </div>
          ))}

          {/* Spread indicator */}
          {data && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem 0", gap: "0.5rem" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span className="mono" style={{ fontSize: "0.65rem", color: "var(--blue)", padding: "0.2rem 0.5rem", background: "rgba(0,152,218,0.1)", borderRadius: "0.25rem", border: "1px solid rgba(0,152,218,0.2)" }}>
                {parseFloat(data.bestAsk) > 0 && parseFloat(data.bestBid) > 0
                  ? `Spread: ${(parseFloat(data.bestAsk) - parseFloat(data.bestBid)).toFixed(6)}`
                  : "Spread: —"
                }
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          )}

          {/* Bids (buys) — green */}
          {(data?.bids ?? []).map((bid, i) => (
            <div key={`bid-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid rgba(26,48,80,0.3)" }}>
              <span className="mono" style={{ fontSize: "0.72rem", color: "#34d399" }}>{bid.price}</span>
              <span className="mono" style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{bid.amount}</span>
              <span className="mono" style={{ fontSize: "0.65rem", color: "#34d399" }}>BUY</span>
            </div>
          ))}

          {(!data?.bids?.length && !data?.asks?.length) && (
            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#475569", padding: "1rem 0" }}>
              No orderbook data available
            </p>
          )}
        </div>
      )}
    </div>
  );
}