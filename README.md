# pi River

Heads-up confidential Texas Hold'em on [Inco Lightning](https://docs.inco.org) + [Megapot](https://docs.megapot.io) Sealed River Jackpot. Built for the **Inco x Megapot Summer Game Jam**.

- **Live:** https://pi.sithunyein.com
- **Repo:** https://github.com/thesithunyein/pi-river
- **Network:** Base Sepolia (84532)
- **Submit twice:** once for **Inco** track, once for **Megapot** track (Typeform rule)

## Judge paths (≤90s)

### Inco track
1. Google sign-in → **Play vs Bot**
2. Fold / Check with **zero MetaMask** (silent play wallet)
3. Hole cards stay encrypted until sealed showdown reveal

### Megapot track
1. Win a hand → toast grants **Megapot ticket credits**
2. Open **Rewards** → **Claim Megapot ticket**
3. House mints a real Megapot NFT to your play wallet on Base Sepolia

## Why this is real

- Shuffle/deal use Inco `shuffledRange` / encrypted hole cards
- Only your play wallet can `attestedDecrypt` your holes
- Showdown verifies covalidator attestations on-chain
- Megapot tickets are purchased via `JackpotRandomTicketBuyer` (`source=pi-river`)

Fun chips / Shop cosmetics are local progression. Table buy-in + Megapot tickets are on-chain testnet.

## Quick start

```bash
bun install
cp .env.example .env.local
# PRIVATE_KEY = house/bot wallet (ETH drip + Megapot USDC mint)
# NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS = deployed RiverHoldem
bun run dev
```

## Contracts

- RiverHoldem: see `NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS`
- Megapot Sepolia Jackpot: `0x465dA3c859f193A3807386387bEE941B2A4c3279`
- Megapot RandomBuyer: `0x53c04e7e5044B28Ea8A4F9c4b26E3Ac1aeb63746`

## Jam disclosure

Summer Game Jam week (Aug 2026). Dual-track product on one URL.
