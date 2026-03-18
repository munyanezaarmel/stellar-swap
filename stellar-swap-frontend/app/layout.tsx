import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarSwap | XLM ↔ USDC on Testnet",
  description: "Swap XLM for USDC on the Stellar DEX testnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Animated star background */}
        <div className="stars" aria-hidden="true" />

        {/* Grid overlay */}
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.2,
          backgroundImage: "linear-gradient(rgba(0,152,218,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,152,218,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Top glow */}
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,152,218,0.12) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", zIndex: 10 }}>
          {children}
        </div>
      </body>
    </html>
  );
}