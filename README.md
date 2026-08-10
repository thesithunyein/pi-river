<p align="center">
  <img src="public/logo.svg" alt="pi River" width="160" height="160" />
</p>

<h1 align="center">pi River</h1>

<p align="center">
  <img src="public/brand/shield-icon.svg" alt="pi River shield" width="42" height="42" />
  &nbsp;
  <strong>Confidential Texas Hold’em on Inco Lightning + Megapot Sealed River</strong>
</p>

<p align="center">
  <a href="https://pi.sithunyein.com"><img alt="Live" src="https://img.shields.io/badge/Live-pi.sithunyein.com-0284C7?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  <a href="https://github.com/thesithunyein/pi-river"><img alt="Repo" src="https://img.shields.io/badge/GitHub-pi--river-0B1220?style=for-the-badge&logo=github" /></a>
  <a href="https://docs.inco.org"><img alt="Inco" src="https://img.shields.io/badge/Inco-Lightning-38BDF8?style=for-the-badge" /></a>
  <a href="https://docs.megapot.io"><img alt="Megapot" src="https://img.shields.io/badge/Megapot-Sealed%20River-F5C518?style=for-the-badge" /></a>
</p>

<p align="center">
  <img src="public/brand/mi-mark.svg" alt="pi mark" width="48" height="48" />
</p>

**pi River** is a production-style heads-up poker product: Google sign-in, silent Base Sepolia play wallets, **Inco-encrypted hole cards**, fun-chip progression, cosmetics shop, club chat, and real **Megapot** ticket claims — one live URL for both jam tracks.

| | |
|---|---|
| **Live app** | https://pi.sithunyein.com |
| **Mirror** | https://mi.sithunyein.com |
| **Network** | Base Sepolia (`84532`) |
| **Jam** | Inco × Megapot Summer Game Jam (submit once per track) |

---

## Product snapshot

| Surface | What players get |
|---|---|
| **Table** | Heads-up Hold’em vs bot / friends · buy-in on-chain · encrypted holes until sealed showdown |
| **Inco** | `shuffledRange` deal · player-only `attestedDecrypt` · covalidator-backed reveal |
| **Megapot** | Ticket credits on wins · house-minted NFT via `JackpotRandomTicketBuyer` (`source=pi-river`) |
| **Progress** | Daily bonus (UTC once/day) · missions · achievements · durable cloud sync (Supabase) |
| **Shop** | Frames & stickers · chip packs (on-chain deposit → credit) |
| **Social** | Live club chat · ladder presence · friend challenges · public profiles |

---

## Architecture

```mermaid
flowchart TB
  subgraph Client["Next.js App Router · Vercel"]
    UI["Shell UI<br/>Lobby · Table · Shop · Rewards · Profile"]
    GC["GameContext<br/>progress · cosmetics · wallet session"]
    WG["wagmi / viem<br/>silent play wallet"]
  end

  subgraph Auth["Identity"]
    SB["Supabase Auth<br/>Google OAuth"]
    ID["Deterministic play wallet<br/>from user id"]
  end

  subgraph Chain["Base Sepolia"]
    RH["RiverHoldem<br/>Inco Lightning holes"]
    RC["RiverChips / economy"]
    MP["Megapot<br/>RandomTicketBuyer"]
  end

  subgraph Server["API routes · house key"]
    API["/api/progress · chips · megapot<br/>rewards · chat · players"]
    DRIP["ETH drip · USDC mint · ticket buy"]
  end

  subgraph Data["Supabase"]
    PP["player_progress"]
    CH["club_chat"]
    OW["owned frames / stickers"]
  end

  UI --> GC --> WG
  UI --> SB --> ID --> WG
  WG --> RH
  WG --> RC
  UI --> API
  API --> PP
  API --> CH
  API --> OW
  API --> DRIP --> MP
  API --> RH
  RH -. encrypt / decrypt .-> Inco["Inco Lightning TEE"]
```

### Hand privacy loop (Inco)

```mermaid
sequenceDiagram
  participant P as Player (play wallet)
  participant App as pi River
  participant RH as RiverHoldem
  participant I as Inco Lightning

  App->>RH: start / buy-in
  RH->>I: shuffledRange + encrypted deal
  I-->>RH: encrypted hole handles
  RH-->>P: encrypted holes (only P can decrypt)
  P->>I: attestedDecrypt (own holes)
  I-->>P: plaintext for local UI
  Note over RH,I: Opponent holes stay sealed until showdown
  App->>RH: showdown
  RH->>I: verify covalidator attestations
  RH-->>App: reveal + settle
```

### Megapot claim loop

```mermaid
flowchart LR
  W[Win hand] --> C[Ticket credit in progress]
  C --> R[Rewards → Claim]
  R --> API["/api/megapot/claim"]
  API --> Buy[House calls RandomTicketBuyer]
  Buy --> NFT[Megapot NFT → play wallet]
```

---

## Judge paths (≤90s)

### Inco track
1. Open **Live** → Google sign-in  
2. **Play vs Bot** — fold / check with **zero MetaMask** (silent play wallet)  
3. Watch **Inco · encrypted holes** until sealed showdown reveal  

### Megapot track
1. Win a hand → toast / overlay credits a **Megapot ticket**  
2. **Rewards** → **Claim Megapot ticket**  
3. House mints a real Megapot NFT to the play wallet on Base Sepolia  

---

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 15 · React 19 · TypeScript · Tailwind |
| Chain | Base Sepolia · viem · wagmi |
| Privacy | Inco Lightning (`@inco/lightning-js`) |
| Jackpot | Megapot Sealed River buyer contracts |
| Auth / DB | Supabase (Google + `player_progress` + chat) |
| Contracts | Foundry (`contracts/`) |
| Deploy | Vercel |

---

## Repository structure

```text
pi-river/
├── public/
│   ├── logo.svg                 # App logo (hero / README)
│   ├── brand/
│   │   ├── shield-icon.svg      # Product shield mark
│   │   ├── mi-mark.svg          # Wordmark tile
│   │   ├── mi-logo.svg
│   │   └── …
│   ├── frames/                  # Avatar ornate frames
│   ├── stickers/                # Shop / chat stickers
│   └── audio/
├── src/
│   ├── app/
│   │   ├── (shell)/             # Lobby, table, shop, rewards, profile
│   │   ├── api/                 # progress, chips, megapot, rewards, chat, …
│   │   └── auth/                # OAuth callbacks
│   ├── components/              # Table UI, shop, chat, overlays
│   ├── context/GameContext.tsx  # Client game + progress state
│   ├── hooks/                   # Ladder / seat presence
│   └── lib/
│       ├── inco/                # Encrypt / decrypt helpers
│       ├── megapot/             # Ticket claim client
│       ├── wallet/              # Silent play wallet
│       ├── cloudProgress.ts     # Supabase merge / flush
│       ├── missions.ts
│       ├── frames.ts · stickers.ts
│       └── …
├── contracts/
│   ├── src/
│   │   ├── RiverHoldem.sol      # Confidential Hold’em table
│   │   ├── RiverChips.sol       # Chip economy
│   │   ├── RiverClub.sol
│   │   ├── CardLib.sol · HoldemEval.sol
│   │   └── kit/ConfidentialDeck.sol
│   └── script/                  # Foundry deploys
├── supabase/
│   ├── migrations/              # 001…008 durable progress / shop / daily
│   └── FULL_SETUP.sql           # One-shot paste for empty projects
├── scripts/                     # Asset generators (stickers, crops)
├── package.json
└── README.md
```

---

## Quick start

```bash
bun install
cp .env.example .env.local
# Fill Supabase + contract addresses
# PRIVATE_KEY = house/bot wallet (ETH drip + Megapot USDC mint) — local / Vercel only
bun run dev
```

Optional: apply `supabase/FULL_SETUP.sql` (or migrations `001`–`008`) in the Supabase SQL editor.

### Contracts (Base Sepolia)

| Contract | Notes |
|---|---|
| **RiverHoldem** | `NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS` |
| **Megapot Jackpot** | `0x465dA3c859f193A3807386387bEE941B2A4c3279` |
| **Megapot RandomBuyer** | `0x53c04e7e5044B28Ea8A4F9c4b26E3Ac1aeb63746` |

Fun chips / shop cosmetics are progression. Table buy-in + Megapot tickets are on-chain testnet.

---

## Brand assets

| Asset | Path |
|---|---|
| App logo | [`public/logo.svg`](public/logo.svg) |
| Shield icon | [`public/brand/shield-icon.svg`](public/brand/shield-icon.svg) |
| Mark | [`public/brand/mi-mark.svg`](public/brand/mi-mark.svg) |
| Logo wordmark | [`public/brand/mi-logo.svg`](public/brand/mi-logo.svg) |

---

## Environment

See [`.env.example`](.env.example). Never commit `PRIVATE_KEY` or `.env.local`.

Typical production keys (Vercel):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS` (+ chips / club if used)
- `PRIVATE_KEY` (house — drip, Megapot mint)
- Base Sepolia RPC URLs

---

## Jam disclosure

Summer Game Jam week (Aug 2026). Dual-track product on **one** URL — submit separately for **Inco** and **Megapot** tracks per Typeform rules.

---

<p align="center">
  <img src="public/brand/shield-icon.svg" width="28" height="28" alt="" />
  &nbsp;Built with Inco Lightning · Megapot · Base Sepolia · Supabase · Next.js
</p>
