/**
 * lib/wallet.ts
 *
 * StellarWalletsKit singleton.
 * We initialize it ONCE and export it for use across the app.
 *
 * WHY a singleton?
 * The kit manages wallet state internally. If we create multiple instances
 * they won't share state and things break. One instance = one source of truth.
 */

// We use dynamic import because StellarWalletsKit uses browser APIs
// and Next.js tries to run code on the server too (SSR).
// Dynamic import ensures it only runs in the browser.

import { NETWORK_PASSPHRASE } from "./stellar";

let kitInstance: import("@creit-tech/stellar-wallets-kit/sdk").StellarWalletsKitClass | null = null;

export async function getKit() {
  if (kitInstance) return kitInstance;

  // Dynamic import — only runs in browser
  const { StellarWalletsKit } = await import("@creit-tech/stellar-wallets-kit/sdk");
  const { defaultModules }    = await import("@creit-tech/stellar-wallets-kit/modules/utils");
  const { Networks }          = await import("@stellar/stellar-sdk");

  StellarWalletsKit.init({
    modules: defaultModules(),
    network: Networks.TESTNET,
    authModal: {
      showInstallLabel:       true,   // show "install this wallet" link
      hideUnsupportedWallets: false,  // show all wallets even if not installed
    },
  });

  kitInstance = StellarWalletsKit;
  return StellarWalletsKit;
}

/**
 * Opens the wallet picker modal and returns the selected address.
 * This is the main entry point for connecting a wallet.
 */
export async function connectWallet(): Promise<{ address: string | null; error: string | null }> {
  try {
    const kit = await getKit();
    const { address } = await kit.authModal();
    return { address, error: null };
  } catch (err) {
    // ERROR TYPE 1: Wallet not found / user closed modal
    if (err instanceof Error && err.message.includes("closed")) {
      return { address: null, error: "Wallet modal was closed" };
    }
    return {
      address: null,
      error: err instanceof Error ? err.message : "Failed to connect wallet",
    };
  }
}

/**
 * Get the currently connected address (without opening modal)
 */
export async function getAddress(): Promise<string | null> {
  try {
    const kit = await getKit();
    const { address } = await kit.getAddress();
    return address;
  } catch {
    return null;
  }
}

/**
 * Sign a transaction XDR using the connected wallet.
 * This opens the wallet popup asking the user to approve.
 */
export async function signTx(xdr: string, address: string): Promise<string> {
  const kit = await getKit();

  const { signedTxXdr } = await kit.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });

  return signedTxXdr;
}

/**
 * Disconnect the wallet
 */
export async function disconnectWallet(): Promise<void> {
  try {
    const kit = await getKit();
    // Kit handles disconnect via its profile modal
    // We just clear our local reference
    kitInstance = null;
  } catch {
    // ignore
  }
}