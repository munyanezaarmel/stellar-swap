"use client";
/**
 * components/SwapStats.tsx
 *
 * Reads live data from our deployed Soroban contract.
 * Shows total swaps and volume tracked on-chain.
 * Auto-refreshes every 5 seconds.
 */

import { useState, useEffect } from "react";
import { BarChart3, RefreshCw, ExternalLink } from "lucide-react";
import { getContractStats, formatXlm, CONTRACT_ID } from "@/lib/stellar";

interface SwapStatsProps {
  refreshTrigger: number; // increment this to force a refresh
}

export default function SwapStats({ refreshTrigger }: SwapStatsProps) {
  const [totalSwaps,  setTotalSwaps]  = useState(0);
  const [totalVolume, setTotalVolume] = useState("0");
  const [loading,     setLoading]     = useState(true);

  async function load() {
    const stats = await getContractStats();
    setTotalSwaps(stats.total_swaps);
    setTotalVolume(formatXlm(stats.total_volume));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={15} style={{ color: "var(--blue)" }} />
          <div>
            <h3 className="mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Contract Stats
            </h3>
            <p style={{ fontSize: "0.65rem", color: "#475569" }}>On-chain · Live</p>
          </div>
        </div>
        <RefreshCw size={12} style={{ color: "#475569" }} className={loading ? "animate-spin" : ""} />
      </div>

      <div style={{ padding: "1.25rem" }}>
        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ padding: "0.875rem", borderRadius: "0.75rem", background: "rgba(0,152,218,0.06)", border: "1px solid rgba(0,152,218,0.15)" }}>
            <p className="mono" style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.375rem" }}>
              Total Swaps
            </p>
            {loading
              ? <div className="shimmer" style={{ height: "1.75rem", width: "4rem" }} />
              : <p className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--blue)" }}>{totalSwaps}</p>
            }
          </div>
          <div style={{ padding: "0.875rem", borderRadius: "0.75rem", background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.15)" }}>
            <p className="mono" style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.375rem" }}>
              Total Volume
            </p>
            {loading
              ? <div className="shimmer" style={{ height: "1.75rem", width: "5rem" }} />
              : <p className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--lumen)" }}>{totalVolume} <span style={{ fontSize: "0.7rem" }}>XLM</span></p>
            }
          </div>
        </div>

        {/* Contract info */}
        <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(10,22,40,0.6)", border: "1px solid var(--border)" }}>
          <p className="mono" style={{ fontSize: "0.6rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.375rem" }}>
            Contract Address
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <code className="mono" style={{ fontSize: "0.6rem", color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {CONTRACT_ID}
            </code>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: "#475569", display: "flex", flexShrink: 0 }}
            >
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}