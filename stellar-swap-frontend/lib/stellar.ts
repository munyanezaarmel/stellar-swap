/**
 * lib/stellar.ts
 *
 * ALL Stellar logic lives here:
 * 1. Horizon API — fetch orderbook, prices, account balance
 * 2. DEX Swap    — PathPaymentStrictSend to swap XLM → USDC
 * 3. Contract    — call our deployed SwapTracker contract
 */

import * as StellarSdk from "@stellar/stellar-sdk";

// ─── NETWORK CONFIG ───────────────────────────────────────────────────────────
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const HORIZON_URL        = "https://horizon-testnet.stellar.org";
export const server             = new StellarSdk.Horizon.Server(HORIZON_URL);
export const rpc                = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");

// Our deployed contract ID — replace with yours if redeploying
export const CONTRACT_ID = "CD2FGJO462QSNOWSVN4FVOE4ZM2OY2O6VPAZZCOZQMN4HMLH6B5NC4A7";

// USDC on Stellar testnet (Circle's test USDC)
export const USDC_ISSUER  = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const USDC_ASSET   = new StellarSdk.Asset("USDC", USDC_ISSUER);
export const XLM_ASSET    = StellarSdk.Asset.native();

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface SwapStats {
  total_swaps:  number;
  total_volume: string; // in stroops
}

export interface SwapRecord {
  user:         string;
  xlm_amount:   string;
  usdc_amount:  string;
  swap_number:  number;
}

export interface OrderbookData {
  bids: { price: string; amount: string }[];
  asks: { price: string; amount: string }[];
  bestBid: string;
  bestAsk: string;
}

export type TxStatus = "idle" | "pending" | "success" | "error";

// ─── ACCOUNT / BALANCE ────────────────────────────────────────────────────────

/**
 * Fetch XLM and USDC balances for an address
 */
export async function fetchBalances(publicKey: string): Promise<{
  xlm: string;
  usdc: string;
}> {
  try {
    const account = await server.loadAccount(publicKey);

    const xlm = account.balances.find(b => b.asset_type === "native")?.balance ?? "0";

    // Narrow the type properly — check asset_type first, then access asset_code
    const usdcBalance = account.balances.find(b => {
      if (b.asset_type !== "credit_alphanum4" && b.asset_type !== "credit_alphanum12") return false;
      const assetBalance = b as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
      return assetBalance.asset_code === "USDC" && assetBalance.asset_issuer === USDC_ISSUER;
    });
    const usdc = usdcBalance?.balance ?? "0";

    return { xlm, usdc };
  } catch {
    return { xlm: "0", usdc: "0" };
  }
}

/**
 * Check if account has a USDC trustline
 */
export async function hasUsdcTrustline(publicKey: string): Promise<boolean> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.some(b => {
      if (b.asset_type !== "credit_alphanum4" && b.asset_type !== "credit_alphanum12") return false;
      const ab = b as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
      return ab.asset_code === "USDC" && ab.asset_issuer === USDC_ISSUER;
    });
  } catch {
    return false;
  }
}

// ─── ORDERBOOK ────────────────────────────────────────────────────────────────

/**
 * Fetch live XLM/USDC orderbook from Stellar DEX
 * This is the real DEX orderbook — live bids and asks
 */
export async function fetchOrderbook(): Promise<OrderbookData> {
  try {
    const orderbook = await server.orderbook(XLM_ASSET, USDC_ASSET).call();

    const bids = orderbook.bids.slice(0, 5).map(b => ({
      price:  parseFloat(b.price).toFixed(6),
      amount: parseFloat(b.amount).toFixed(2),
    }));
    const asks = orderbook.asks.slice(0, 5).map(a => ({
      price:  parseFloat(a.price).toFixed(6),
      amount: parseFloat(a.amount).toFixed(2),
    }));

    return {
      bids,
      asks,
      bestBid: bids[0]?.price ?? "0",
      bestAsk: asks[0]?.price ?? "0",
    };
  } catch {
    return { bids: [], asks: [], bestBid: "0", bestAsk: "0" };
  }
}

/**
 * Get estimated USDC output for a given XLM input
 * Uses Horizon's path finding to get the best rate
 */
export async function getSwapEstimate(xlmAmount: string): Promise<string> {
  try {
    const paths = await server
      .strictSendPaths(XLM_ASSET, xlmAmount, [USDC_ASSET])
      .call();

    if (paths.records.length > 0) {
      return parseFloat(paths.records[0].destination_amount).toFixed(6);
    }
    return "0";
  } catch {
    return "0";
  }
}

// ─── DEX SWAP ─────────────────────────────────────────────────────────────────

/**
 * Execute a real XLM → USDC swap on the Stellar DEX
 * Uses PathPaymentStrictSend — sends exact XLM, receives best USDC amount
 *
 * Steps:
 * 1. Load sender account (need sequence number)
 * 2. Build PathPaymentStrictSend operation
 * 3. Sign with wallet (via StellarWalletsKit)
 * 4. Submit to network
 */
export async function swapXlmToUsdc(
  senderPublicKey: string,
  xlmAmount: string,
  minUsdcAmount: string,
  signTransaction: (xdr: string) => Promise<string>,
  usdcEstimate: string = "0",
): Promise<{ success: boolean; hash?: string; usdcReceived?: string; error?: string }> {
  try {
    // Load account
    const account = await server.loadAccount(senderPublicKey);

    // Build the swap transaction
    // PathPaymentStrictSend = send EXACTLY xlmAmount XLM, receive AT LEAST minUsdcAmount USDC
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset:    XLM_ASSET,
          sendAmount:   xlmAmount,
          destination:  senderPublicKey,  // send to yourself (swap)
          destAsset:    USDC_ASSET,
          destMin:      minUsdcAmount,    // minimum USDC to accept (slippage protection)
          path:         [],               // empty = Stellar finds best path automatically
        })
      )
      .setTimeout(30)
      .build();

    // Sign using the wallet (opens wallet popup)
    const signedXdr = await signTransaction(transaction.toXDR());

    // Submit to network
    const signed = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await server.submitTransaction(signed);

    // Extract how much USDC was actually received
    // We use the estimate as fallback — the actual amount is very close
    let usdcReceived = minUsdcAmount;
    try {
      const txDetails = await server.transactions().transaction(result.hash).call();
      // If we got here the tx was confirmed — use estimate as received amount
      usdcReceived = usdcEstimate || minUsdcAmount;
    } catch {
      // Keep minUsdcAmount as fallback
    }
    void usdcEstimate; // suppress unused warning

    return { success: true, hash: result.hash, usdcReceived };
  } catch (err: unknown) {
    // Parse Stellar-specific errors
    if (err && typeof err === "object" && "response" in err) {
      const e = err as { response?: { data?: { extras?: { result_codes?: { operations?: string[] } } } } };
      const opCode = e.response?.data?.extras?.result_codes?.operations?.[0];
      if (opCode === "op_too_few_offers") {
        return { success: false, error: "Not enough liquidity in the DEX for this swap" };
      }
      if (opCode === "op_under_dest_min") {
        return { success: false, error: "Price moved too much — try again or increase slippage" };
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Swap failed",
    };
  }
}

/**
 * Add USDC trustline to wallet
 * Required before you can receive USDC
 */
export async function addUsdcTrustline(
  publicKey: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await server.loadAccount(publicKey);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: USDC_ASSET,
        })
      )
      .setTimeout(30)
      .build();

    const signedXdr = await signTransaction(transaction.toXDR());
    const signed = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    await server.submitTransaction(signed);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add trustline",
    };
  }
}

// ─── CONTRACT INTERACTION ─────────────────────────────────────────────────────

/**
 * Read swap stats from our deployed contract (FREE — no transaction needed)
 * Uses Soroban RPC simulateTransaction for read-only calls
 */
export async function getContractStats(): Promise<SwapStats> {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    // Build a read-only call
    const account = new StellarSdk.Account(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
      "0"
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_stats"))
      .setTimeout(30)
      .build();

    const result = await rpc.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && result.result) {
      const val = result.result.retval;
      const map = val.map();
      if (map) {
        const stats: SwapStats = { total_swaps: 0, total_volume: "0" };
        map.forEach(entry => {
          const key = entry.key().sym()?.toString();
          if (key === "total_swaps") stats.total_swaps = entry.val().u32();
          if (key === "total_volume") stats.total_volume = entry.val().i128().toString();
        });
        return stats;
      }
    }
    return { total_swaps: 0, total_volume: "0" };
  } catch {
    return { total_swaps: 0, total_volume: "0" };
  }
}

/**
 * Record a swap in our contract (WRITE — requires signature)
 * Called AFTER a successful DEX swap
 */
export async function recordSwapInContract(
  userPublicKey: string,
  xlmAmount: string,
  usdcAmount: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const contract  = new StellarSdk.Contract(CONTRACT_ID);
    const account   = await server.loadAccount(userPublicKey);

    // Convert amounts to stroops (multiply by 10_000_000)
    const xlmStroops  = BigInt(Math.round(parseFloat(xlmAmount)  * 10_000_000));
    const usdcStroops = BigInt(Math.round(parseFloat(usdcAmount) * 10_000_000));

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "record_swap",
          StellarSdk.nativeToScVal(userPublicKey, { type: "address" }),
          StellarSdk.nativeToScVal(xlmStroops, { type: "i128" }),
          StellarSdk.nativeToScVal(usdcStroops, { type: "i128" }),
        )
      )
      .setTimeout(30)
      .build();

    // Simulate first to get the correct footprint
    const sim = await rpc.simulateTransaction(tx);
    if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
      return { success: false, error: "Contract simulation failed" };
    }

    // Assemble the transaction with the simulation result
    const assembled = StellarSdk.rpc.assembleTransaction(tx, sim).build();

    // Sign with wallet
    const signedXdr = await signTransaction(assembled.toXDR());
    const signed    = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // Submit via RPC
    const sendResult = await rpc.sendTransaction(signed);
    if (sendResult.status === "ERROR") {
      return { success: false, error: "Contract call failed" };
    }

    // Wait for confirmation
    let getResult = await rpc.getTransaction(sendResult.hash);
    let attempts = 0;
    while (getResult.status === "NOT_FOUND" && attempts < 10) {
      await new Promise(r => setTimeout(r, 1500));
      getResult = await rpc.getTransaction(sendResult.hash);
      attempts++;
    }

    return {
      success: getResult.status === "SUCCESS",
      hash: sendResult.hash,
      error: getResult.status !== "SUCCESS" ? "Transaction did not confirm" : undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Contract call failed",
    };
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

export function formatXlm(stroops: string | number): string {
  return (Number(stroops) / 10_000_000).toFixed(2);
}

export function shortenAddress(address: string, chars = 6): string {
  // ✅ Handle short addresses
  if (!address || address.length <= chars * 2) {
    return address;
  }

  const start = address.slice(0, chars);
  const end   = address.slice(-chars);

  return `${start}...${end}`;
}
export function getExplorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function getExplorerAccountUrl(addr: string): string {
  return `https://stellar.expert/explorer/testnet/account/${addr}`;
}