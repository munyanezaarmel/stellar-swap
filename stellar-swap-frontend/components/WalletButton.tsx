"use client";
/**
 * components/WalletButton.tsx
 *
 * Multi-wallet connect button using StellarWalletsKit.
 * When clicked it opens a modal showing ALL supported wallets:
 * Freighter, xBull, Albedo, Rabet, Lobstr, etc.
 */

import { useState } from "react";
import { Wallet, LogOut, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { connectWallet, disconnectWallet } from "@/lib/wallet";
import { shortenAddress, getExplorerAccountUrl } from "@/lib/stellar";

interface WalletButtonProps {
  address: string | null;
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

export default function WalletButton({ address, onConnect, onDisconnect }: WalletButtonProps) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    const result = await connectWallet();
    if (result.error) {
      setError(result.error);
    } else if (result.address) {
      onConnect(result.address);
    }
    setLoading(false);
  }

  async function handleDisconnect() {
    await disconnectWallet();
    onDisconnect();
    setShowMenu(false);
  }

  // ── Connected ────────────────────────────────────────────────────────────
  if (address) {
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.4rem 0.75rem", borderRadius: "9999px",
            background: "var(--surface)", border: "1px solid var(--border)",
            cursor: "pointer", color: "#e2e8f0",
          }}
        >
          {/* Live green dot */}
          <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
            <span className="ping" style={{ position: "absolute", inset: 0, borderRadius: "9999px", background: "#34d399", opacity: 0.7 }} />
            <span style={{ position: "relative", display: "block", width: 8, height: 8, borderRadius: "9999px", background: "#10b981" }} />
          </div>
          <span className="mono" style={{ fontSize: "0.7rem", color: "#cbd5e1" }}>
            {shortenAddress(address)}
          </span>
          <ChevronDown size={12} style={{ color: "#64748b" }} />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div style={{
            position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "0.75rem", padding: "0.5rem", minWidth: "180px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 100,
          }}>
            <a
              href={getExplorerAccountUrl(address)}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", color: "#94a3b8", fontSize: "0.78rem", textDecoration: "none" }}
              onClick={() => setShowMenu(false)}
            >
              <ExternalLink size={13} />
              <span>View on Explorer</span>
            </a>
            <button
              onClick={handleDisconnect}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.78rem", width: "100%", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <LogOut size={13} />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Disconnected ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.375rem" }}>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-primary"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.25rem", borderRadius: "0.5rem" }}
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /><span>Connecting...</span></>
          : <><Wallet size={14} /><span>Connect Wallet</span></>
        }
      </button>
      {error && (
        <p style={{ fontSize: "0.7rem", color: "#f87171" }}>{error}</p>
      )}
    </div>
  );
}