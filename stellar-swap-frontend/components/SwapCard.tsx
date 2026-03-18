"use client";
/**
 * components/SwapCard.tsx
 *
 * The main swap interface. Users enter XLM amount,
 * see estimated USDC output, and execute the swap.
 *
 * Flow:
 * 1. User enters XLM amount
 * 2. We fetch estimate from Stellar DEX path finding
 * 3. User clicks Swap
 * 4. PathPaymentStrictSend executes on DEX
 * 5. We record the swap in our contract
 * 6. Show success with tx hash
 */

import { useState, useEffect, useCallback } from "react";
import { ArrowDown, RefreshCw, Loader2, CheckCircle, XCircle, ExternalLink, AlertTriangle, Info } from "lucide-react";
import {
  getSwapEstimate, swapXlmToUsdc, addUsdcTrustline,
  hasUsdcTrustline, recordSwapInContract,
  getExplorerTxUrl, fetchBalances,
} from "@/lib/stellar";
import { signTx } from "@/lib/wallet";

type TxStatus = "idle" | "checking" | "approving_trustline" | "swapping" | "recording" | "success" | "error";

interface SwapCardProps {
  address: string;
  onSwapComplete: () => void; // tells parent to refresh stats
}

export default function SwapCard({ address, onSwapComplete }: SwapCardProps) {
  const [xlmAmount, setXlmAmount]       = useState("");
  const [usdcEstimate, setUsdcEstimate] = useState("0.00");
  const [xlmBalance, setXlmBalance]     = useState("0");
  const [usdcBalance, setUsdcBalance]   = useState("0");
  const [hasTrustline, setHasTrustline] = useState(false);
  const [txStatus, setTxStatus]         = useState<TxStatus>("idle");
  const [txHash, setTxHash]             = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [slippage]                      = useState(0.5); // 0.5% slippage tolerance

  // Load balances and trustline status on mount
  useEffect(() => {
    async function load() {
      const [balances, trust] = await Promise.all([
        fetchBalances(address),
        hasUsdcTrustline(address),
      ]);
      setXlmBalance(balances.xlm);
      setUsdcBalance(balances.usdc);
      setHasTrustline(trust);
    }
    load();
  }, [address, txStatus]);

  // Fetch estimate when XLM amount changes
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const amount = parseFloat(xlmAmount);
      if (!xlmAmount || isNaN(amount) || amount < 1) {
        setUsdcEstimate("0.00");
        return;
      }
      setIsEstimating(true);
      const est = await getSwapEstimate(xlmAmount);
      setUsdcEstimate(est);
      setIsEstimating(false);
    }, 500); // debounce 500ms

    return () => clearTimeout(timeout);
  }, [xlmAmount]);

  // Sign helper — binds address to signTx
  const sign = useCallback((xdr: string) => signTx(xdr, address), [address]);

  // Handle trustline addition
  async function handleAddTrustline() {
    setTxStatus("approving_trustline");
    setError(null);
    const result = await addUsdcTrustline(address, sign);
    if (result.success) {
      setHasTrustline(true);
      setTxStatus("idle");
    } else {
      setError(result.error ?? "Failed to add trustline");
      setTxStatus("error");
    }
  }

  // Main swap handler
  async function handleSwap() {
    const amount = parseFloat(xlmAmount);

    // ERROR TYPE 1: Invalid amount
    if (!xlmAmount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // ERROR TYPE 2: Insufficient balance
    if (amount > parseFloat(xlmBalance) - 1) { // keep 1 XLM for fees
      setError("Insufficient XLM balance (keep at least 1 XLM for fees)");
      return;
    }

    // ERROR TYPE 3: No trustline
    if (!hasTrustline) {
      setError("You need to add a USDC trustline first");
      return;
    }

    setTxStatus("swapping");
    setError(null);
    setTxHash(null);

    // Calculate minimum USDC with slippage protection
    const estUsdc    = parseFloat(usdcEstimate);
    const minUsdc    = (estUsdc * (1 - slippage / 100)).toFixed(6);

    // Step 1: Execute DEX swap
    const swapResult = await swapXlmToUsdc(address, xlmAmount, minUsdc, sign, usdcEstimate);

    if (!swapResult.success) {
      setError(swapResult.error ?? "Swap failed");
      setTxStatus("error");
      return;
    }

    setTxHash(swapResult.hash ?? null);
    setTxStatus("recording");

    // Step 2: Record swap in our contract
    const recordResult = await recordSwapInContract(
      address,
      xlmAmount,
      swapResult.usdcReceived ?? usdcEstimate,
      sign,
    );

    if (!recordResult.success) {
      // Swap succeeded but recording failed — still show success
      // The DEX swap already happened, we just couldn't log it
      console.warn("Contract recording failed:", recordResult.error);
    }

    setTxStatus("success");
    setXlmAmount("");
    setUsdcEstimate("0.00");
    onSwapComplete();
  }

  const isLoading = ["checking","approving_trustline","swapping","recording"].includes(txStatus);

  const statusLabel: Record<TxStatus, string> = {
    idle:                "Swap XLM → USDC",
    checking:            "Checking...",
    approving_trustline: "Approving Trustline...",
    swapping:            "Swapping on DEX...",
    recording:           "Recording on Contract...",
    success:             "Swap Complete!",
    error:               "Swap XLM → USDC",
  };

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="mono" style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Token Swap
            </h2>
            <p style={{ fontSize: "0.7rem", color: "#475569", marginTop: "0.125rem" }}>
              Stellar DEX · Testnet
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.3rem 0.6rem", borderRadius: "9999px", background: "rgba(0,152,218,0.1)", border: "1px solid rgba(0,152,218,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "9999px", background: "var(--blue)" }} />
            <span className="mono" style={{ fontSize: "0.6rem", color: "var(--blue)" }}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Trustline warning */}
        {!hasTrustline && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.875rem", borderRadius: "0.75rem", background: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.2)" }}>
            <AlertTriangle size={15} style={{ color: "var(--lumen)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--lumen)", fontWeight: 600, marginBottom: "0.25rem" }}>
                USDC Trustline Required
              </p>
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.625rem" }}>
                You need to add USDC to your wallet before you can receive it.
              </p>
              <button
                onClick={handleAddTrustline}
                disabled={isLoading}
                className="btn-primary"
                style={{ padding: "0.4rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.7rem" }}
              >
                {txStatus === "approving_trustline"
                  ? <><Loader2 size={12} className="animate-spin" /> Adding...</>
                  : "Add USDC Trustline"}
              </button>
            </div>
          </div>
        )}

        {/* FROM — XLM */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label className="mono" style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              You Pay
            </label>
            <span style={{ fontSize: "0.7rem", color: "#475569" }}>
              Balance: <span style={{ color: "#94a3b8" }}>{parseFloat(xlmBalance).toFixed(2)} XLM</span>
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={xlmAmount}
              onChange={e => { setXlmAmount(e.target.value); setError(null); }}
              placeholder="0.00"
              min="1"
              step="0.01"
              disabled={isLoading}
              className="field-input"
              style={{ paddingRight: "4.5rem" }}
            />
            <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <button
                onClick={() => setXlmAmount((Math.max(0, parseFloat(xlmBalance) - 1)).toFixed(2))}
                style={{ fontSize: "0.6rem", color: "var(--blue)", background: "rgba(0,152,218,0.1)", border: "1px solid rgba(0,152,218,0.2)", borderRadius: "0.25rem", padding: "0.1rem 0.3rem", cursor: "pointer" }}
                className="mono"
              >
                MAX
              </button>
              <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>XLM</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "9999px", background: "var(--dark)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowDown size={14} style={{ color: "var(--blue)" }} />
          </div>
        </div>

        {/* TO — USDC */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label className="mono" style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              You Receive (est.)
            </label>
            <span style={{ fontSize: "0.7rem", color: "#475569" }}>
              Balance: <span style={{ color: "#94a3b8" }}>{parseFloat(usdcBalance).toFixed(2)} USDC</span>
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <div className="field-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "default" }}>
              <span style={{ color: isEstimating ? "#475569" : "#e2e8f0" }}>
                {isEstimating ? "Estimating..." : usdcEstimate}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                {isEstimating && <RefreshCw size={12} className="animate-spin" style={{ color: "#64748b" }} />}
                <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22c55e" }}>USDC</span>
              </div>
            </div>
          </div>
          {/* Slippage info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem" }}>
            <Info size={11} style={{ color: "#475569" }} />
            <span style={{ fontSize: "0.65rem", color: "#475569" }}>
              {slippage}% slippage tolerance · Min received: {(parseFloat(usdcEstimate) * 0.995).toFixed(4)} USDC
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 0.75rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <XCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
            <span style={{ fontSize: "0.75rem", color: "#f87171" }}>{error}</span>
          </div>
        )}

        {/* Success message */}
        {txStatus === "success" && txHash && (
          <div style={{ padding: "1rem", borderRadius: "0.75rem", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <CheckCircle size={16} style={{ color: "#34d399" }} />
              <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399" }}>Swap Successful!</span>
            </div>
            <p style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.375rem" }}>Transaction Hash:</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--dark)", borderRadius: "0.5rem", padding: "0.5rem 0.625rem" }}>
              <code className="mono" style={{ fontSize: "0.6rem", color: "rgba(52,211,153,0.8)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {txHash}
              </code>
              <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b", display: "flex", flexShrink: 0 }}>
                <ExternalLink size={12} />
              </a>
            </div>
            <button onClick={() => setTxStatus("idle")} className="btn-ghost"
              style={{ marginTop: "0.75rem", width: "100%", padding: "0.4rem", borderRadius: "0.5rem", fontSize: "0.7rem" }}>
              Swap Again
            </button>
          </div>
        )}

        {/* Swap button */}
        {txStatus !== "success" && (
          <button
            onClick={handleSwap}
            disabled={isLoading || !xlmAmount || parseFloat(xlmAmount) <= 0}
            className="btn-primary"
            style={{ width: "100%", padding: "0.875rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.8rem" }}
          >
            {isLoading
              ? <><Loader2 size={15} className="animate-spin" /><span>{statusLabel[txStatus]}</span></>
              : <span>{statusLabel[txStatus]}</span>
            }
          </button>
        )}

        {/* Transaction status tracker */}
        {isLoading && (
          <div style={{ display: "flex", gap: "0.375rem", justifyContent: "center" }}>
            {[
              { key: "swapping",  label: "DEX Swap" },
              { key: "recording", label: "Contract" },
            ].map(step => (
              <div key={step.key} style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                padding: "0.25rem 0.625rem", borderRadius: "9999px", fontSize: "0.65rem",
                ...(txStatus === step.key
                  ? { background: "rgba(0,152,218,0.15)", border: "1px solid rgba(0,152,218,0.3)", color: "var(--blue)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "#475569" }
                ),
              }} className="mono">
                {txStatus === step.key && <Loader2 size={10} className="animate-spin" />}
                {step.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}