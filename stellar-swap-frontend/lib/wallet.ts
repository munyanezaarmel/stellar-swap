/**
 * lib/wallet.ts
 *
 * StellarWalletsKit singleton.
 * StellarWalletsKit is a static singleton object — not a class you instantiate.
 * We initialize it once and reuse it everywhere.
 */

import { NETWORK_PASSPHRASE } from "./stellar";

// Track whether we've initialized the kit yet
let initialized = false;

/**
 * Initialize the kit (only once) and return it
 */
export async function getKit() {
  const { StellarWalletsKit } = await import("@creit-tech/stellar-wallets-kit/sdk");
  const { defaultModules }    = await import("@creit-tech/stellar-wallets-kit/modules/utils");
  const { Networks }          = await import("@stellar/stellar-sdk");

  if (!initialized) {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
      authModal: {
        showInstallLabel:       true,
        hideUnsupportedWallets: false,
      },
    });
    initialized = true;
  }

  return StellarWalletsKit;
}

/**
 * Open wallet picker modal — user selects Freighter, xBull, Albedo, etc.
 * Returns the connected address.
 */
export async function connectWallet(): Promise<{ address: string | null; error: string | null }> {
  try {
    const kit = await getKit();
    const { address } = await kit.authModal();
    return { address, error: null };
  } catch (err) {
    // ERROR TYPE 1: User closed the modal or wallet not found
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("close") || msg.toLowerCase().includes("cancel")) {
      return { address: null, error: "Wallet modal was closed" };
    }
    return { address: null, error: msg || "Failed to connect wallet" };
  }
}

/**
 * Get the currently active address without opening the modal
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
 * Opens the wallet popup for user approval.
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
 * Disconnect — resets the kit state
 */
export async function disconnectWallet(): Promise<void> {
  initialized = false;
}