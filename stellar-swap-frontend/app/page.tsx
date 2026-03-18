"use client";
/**
 * app/page.tsx — Main page
 *
 * Layout:
 * - Navbar with wallet connect
 * - Left column:  Swap card + Stats
 * - Right column: Orderbook
 */

import { useState, useCallback } from "react";
import { Star, Github } from "lucide-react";
import WalletButton from "@/components/WalletButton";
import SwapCard     from "@/components/SwapCard";
import Orderbook    from "@/components/Orderbook";
import SwapStats    from "@/components/SwapStats";

export default function HomePage() {
  const [address,        setAddress]        = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleConnect    = useCallback((addr: string) => setAddress(addr), []);
  const handleDisconnect = useCallback(() => setAddress(null), []);
  const handleSwapDone   = useCallback(() => setRefreshTrigger(t => t + 1), []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── NAVBAR ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        background: "rgba(5,10,15,0.75)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <Star size={20} fill="var(--lumen)" style={{ color: "var(--lumen)" }} />
            <span className="mono" style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
              STELLAR<span style={{ color: "var(--blue)" }}>SWAP</span>
            </span>
            <span className="mono" style={{ padding: "0.15rem 0.45rem", borderRadius: "9999px", background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.25)", color: "var(--lumen)", fontSize: "0.58rem", letterSpacing: "0.08em" }}>
              TESTNET
            </span>
          </div>

          <WalletButton
            address={address}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "2.5rem 1.5rem" }}>

        {/* Not connected */}
        {!address && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
            <div style={{ marginBottom: "2rem", width: "5rem", height: "5rem", borderRadius: "1.25rem", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(0,152,218,0.15)", margin: "0 auto 2rem" }}>
              <Star size={36} fill="var(--blue)" style={{ color: "var(--blue)" }} />
            </div>

            <h1 className="mono" style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 700, color: "white", marginBottom: "1rem", lineHeight: 1.1 }}>
              Swap XLM<br /><span style={{ color: "var(--blue)" }}>for USDC</span>
            </h1>

            <p style={{ color: "#94a3b8", maxWidth: "400px", marginBottom: "2rem", lineHeight: 1.7 }}>
              Trade on the Stellar DEX with any wallet. Swaps are recorded on our deployed Soroban smart contract.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.625rem", marginBottom: "2.5rem" }}>
              {[
                "🔄 Real DEX Orderbook",
                "📜 On-chain Swap Log",
                "👛 Multi-wallet Support",
                "⚡ Instant Settlement",
              ].map(f => (
                <span key={f} className="mono" style={{ padding: "0.375rem 0.75rem", borderRadius: "9999px", background: "var(--surface)", border: "1px solid var(--border)", fontSize: "0.72rem", color: "#94a3b8" }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Orderbook preview even when not connected */}
            <div style={{ width: "100%", maxWidth: "400px" }}>
              <Orderbook />
            </div>
          </div>
        )}

        {/* Connected */}
        {address && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <SwapCard address={address} onSwapComplete={handleSwapDone} />
              <SwapStats refreshTrigger={refreshTrigger} />
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Orderbook />

              {/* How it works card */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <h3 className="mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.875rem" }}>
                  How It Works
                </h3>
                {[
                  { n: "1", title: "Connect Wallet", desc: "Use Freighter, xBull, Albedo or any supported wallet" },
                  { n: "2", title: "Add USDC Trustline", desc: "One-time setup to receive USDC in your wallet" },
                  { n: "3", title: "Swap on DEX", desc: "PathPaymentStrictSend routes through live orderbook" },
                  { n: "4", title: "Contract Records It", desc: "Swap is logged on-chain in our Soroban contract" },
                ].map(step => (
                  <div key={step.n} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "9999px", background: "rgba(0,152,218,0.15)", border: "1px solid rgba(0,152,218,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: "0.6rem", color: "var(--blue)", fontWeight: 700 }}>{step.n}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>{step.title}</p>
                      <p style={{ fontSize: "0.7rem", color: "#64748b" }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(26,48,80,0.4)", padding: "1.25rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="mono" style={{ fontSize: "0.65rem", color: "#334155" }}>
            StellarSwap · Level 2 Yellow Belt · Contract: {process.env.NEXT_PUBLIC_CONTRACT_ID?.slice(0,8)}...
          </p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
             style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.65rem", color: "#475569", textDecoration: "none" }} className="mono">
            <Github size={13} /><span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}