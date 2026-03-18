#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Symbol, Vec, symbol_short,
};

// Storage keys
const TOTAL_SWAPS: Symbol = symbol_short!("T_SWAPS");
const TOTAL_VOL:   Symbol = symbol_short!("T_VOL");
const HISTORY:     Symbol = symbol_short!("HISTORY");

// One swap record — saved on chain forever
#[contracttype]
#[derive(Clone)]
pub struct SwapRecord {
    pub user:         Address, // who did the swap
    pub xlm_amount:   i128,    // XLM they sold (in stroops, 1 XLM = 10_000_000)
    pub usdc_amount:  i128,    // USDC they received (in stroops, 1 USDC = 10_000_000)
    pub swap_number:  u32,     // swap #1, #2, #3...
}

// Overall stats
#[contracttype]
#[derive(Clone)]
pub struct SwapStats {
    pub total_swaps:  u32,
    pub total_volume: i128,  // total XLM swapped ever
}

#[contract]
pub struct SwapTracker;

#[contractimpl]
impl SwapTracker {

    // Called by frontend AFTER a successful DEX swap
    // Saves the swap to on-chain history and emits an event
    pub fn record_swap(
        env: Env,
        user: Address,
        xlm_amount: i128,
        usdc_amount: i128,
    ) -> SwapRecord {
        // The real user must sign this — no faking
        user.require_auth();

        // ERROR 1: Amount too small
        if xlm_amount < 10_000_000 {
            panic!("Minimum swap is 1 XLM");
        }

        // ERROR 2: USDC amount invalid
        if usdc_amount <= 0 {
            panic!("Invalid USDC amount");
        }

        // Read current totals
        let swaps: u32  = env.storage().persistent()
            .get(&TOTAL_SWAPS).unwrap_or(0);
        let vol: i128   = env.storage().persistent()
            .get(&TOTAL_VOL).unwrap_or(0);

        let new_swaps = swaps + 1;

        // Build the record
        let record = SwapRecord {
            user:        user.clone(),
            xlm_amount,
            usdc_amount,
            swap_number: new_swaps,
        };

        // Save updated totals
        env.storage().persistent().set(&TOTAL_SWAPS, &new_swaps);
        env.storage().persistent().set(&TOTAL_VOL,   &(vol + xlm_amount));

        // Save to history list (keep last 20 swaps)
        let mut history: Vec<SwapRecord> = env.storage().persistent()
            .get(&HISTORY)
            .unwrap_or(Vec::new(&env));

        history.push_back(record.clone());

        // Keep only last 20 entries to avoid storage bloat
        if history.len() > 20 {
            history.pop_front();
        }

        env.storage().persistent().set(&HISTORY, &history);

        // Emit event — frontend listens to this for real-time updates
        // topic = ["swap", user_address]
        // data  = xlm_amount
        env.events().publish(
            (symbol_short!("swap"), user),
            xlm_amount,
        );

        record
    }

    // Read-only: get overall stats (no transaction needed)
    pub fn get_stats(env: Env) -> SwapStats {
        SwapStats {
            total_swaps:  env.storage().persistent()
                .get(&TOTAL_SWAPS).unwrap_or(0),
            total_volume: env.storage().persistent()
                .get(&TOTAL_VOL).unwrap_or(0),
        }
    }

    // Read-only: get last 20 swaps for the activity feed
    pub fn get_history(env: Env) -> Vec<SwapRecord> {
        env.storage().persistent()
            .get(&HISTORY)
            .unwrap_or(Vec::new(&env))
    }

    // ERROR 3 example — get stats for one user
    // Returns error if user never swapped
    pub fn get_user_total(env: Env, user: Address) -> i128 {
        let history: Vec<SwapRecord> = env.storage().persistent()
            .get(&HISTORY)
            .unwrap_or(Vec::new(&env));

        let mut total: i128 = 0;
        let mut found = false;

        for record in history.iter() {
            if record.user == user {
                total += record.xlm_amount;
                found = true;
            }
        }

        // ERROR 3: User has no swap history
        if !found {
            panic!("No swap history for this address");
        }

        total
    }
}
