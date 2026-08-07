# mi River

Heads-up confidential Texas Hold'em on [Inco Lightning](https://docs.inco.org). Hole cards stay private until showdown. Live product for the Inco x Megapot Summer Game Jam.

- **Live:** https://mi.sithunyein.com
- **Repo:** https://github.com/thesithunyein/mi-river
- **Network:** Base Sepolia (chain id 84532)
- **Track:** Inco

## Why this is real

- Shuffle and deal use Inco `shuffledRange` / `_dealTo` (see `contracts/src`).
- Only your wallet can `attestedDecrypt` your hole cards.
- Community cards are public via `reveal`.
- Showdown verifies covalidator attestations on-chain, then pays the pot.

Cosmetics and daily rewards are separate from fairness. They do not replace Inco.

## Quick start

```bash
bun install
cp .env.example .env.local
# set NEXT_PUBLIC_WALLETCONNECT_ID
# set NEXT_PUBLIC_RIVER_HOLDEM_ADDRESS after deploy
bun run dev
```

### Contracts

```bash
cd contracts
forge build
forge script script/DeployRiverHoldem.s.sol:DeployRiverHoldem --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

Fund the deployer with Base Sepolia ETH. Prefund shuffle fees via `fundFees`.

## Jam disclosure

Built during Summer Game Jam week (created 7 Aug 2026). UI shell and contracts shipped in this repo. No pre-existing on-chain poker.

## Stack

Next.js 15, wagmi, RainbowKit, `@inco/lightning` + `@inco/lightning-js`, Foundry, Vercel.
