# 🌟 StellarSwap — Token Swap Interface

> **Level 2 Yellow Belt** — Stellar Frontend Developer Challenge

A token swap dApp that lets users swap XLM → USDC using the **Stellar DEX orderbook**, with swaps recorded on a deployed **Soroban smart contract**.

---

## 📸 Screenshots

> Add screenshots after running:
> - Wallet picker modal (multiple wallets)
<img width="815" height="654" alt="image" src="https://github.com/user-attachments/assets/3e5ce103-b075-4384-b732-473f0cda38b0" />

> - Swap form with orderbook
<img width="1469" height="918" alt="image" src="https://github.com/user-attachments/assets/bb859f3b-7607-433d-b42a-093d6da9385e" />

> - Successful transaction
>   <img width="1469" height="883" alt="image" src="https://github.com/user-attachments/assets/446526bc-2b43-4c4e-8018-bde815e15595" />
<img width="1469" height="883" alt="image" src="https://github.com/user-attachments/assets/080e0079-e8ff-403b-b46f-c9d465c43059" />


---

## ✨ Features

- 👛 **Multi-wallet** — Freighter, xBull, Albedo, Rabet, Lobstr via StellarWalletsKit
- 🔄 **Real DEX Swap** — PathPaymentStrictSend through live Stellar orderbook
- 📜 **Smart Contract** — Swaps recorded on deployed Soroban contract
- 📊 **Live Orderbook** — Real-time XLM/USDC bids and asks (refreshes every 5s)
- 📈 **On-chain Stats** — Total swaps and volume from contract storage
- ⚠️ **3 Error Types** — Insufficient balance, wallet not found, min amount

---

## 🚀 Setup

```bash
git clone https://github.com/YOUR_USERNAME/stellar-swap
cd stellar-swap
npm install
npx jsr add @creit-tech/stellar-wallets-kit
npm run dev
```

Open http://localhost:3000

### Prerequisites
- Freighter wallet (or any Stellar wallet) set to **Testnet**
- Node.js 18+

---

## 📋 Contract Details

| Field | Value |
|---|---|
| Contract ID | `CD2FGJO462QSNOWSVN4FVOE4ZM2OY2O6VPAZZCOZQMN4HMLH6B5NC4A7` |
| Network | Stellar Testnet |
| Functions | `record_swap`, `get_stats`, `get_history`, `get_user_total` |

**Deployment TX:**
 https://stellar.expert/explorer/testnet/tx/d7d7aed2d603dd0f157e4aa292dee7acf651bedf5514b0615dba054b5e532ab2
 
**VERCEL:**
https://stellar-swap-lwns.vercel.app/

**DEMO for orange belt **
https://www.loom.com/share/31dbc48953b04780962f5233c51e31e7
  


## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 + TypeScript | Frontend framework |
| Tailwind CSS | Styling |
| @stellar/stellar-sdk | DEX swaps + Horizon API |
| @creit-tech/stellar-wallets-kit | Multi-wallet support |
| Soroban (Rust) | Smart contract |

---

## 📁 Project Structure

```
stellar-swap/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── WalletButton.tsx  # Multi-wallet connect
│   ├── SwapCard.tsx      # Swap form + DEX interaction
│   ├── Orderbook.tsx     # Live DEX orderbook
│   └── SwapStats.tsx     # Contract stats
└── lib/
    ├── stellar.ts        # All Stellar/Soroban logic
    └── wallet.ts         # StellarWalletsKit singleton
```

---

## ⚠️ Error Handling

1. **Wallet not found** — Shows install link for missing wallet
2. **Insufficient balance** — Validates XLM amount before swap  
3. **Minimum amount** — Contract rejects swaps under 1 XLM
