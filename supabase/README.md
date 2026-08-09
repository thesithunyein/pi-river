# Cloud + on-chain economy

## On-chain (live on Base Sepolia)

| Contract | Address |
|---|---|
| **RiverChips (rCHIP)** | `0xF80DC75ad153CBBAA3569344A8e5AA8d1D0309b4` |
| **RiverClub ladder** | `0x783f42e659B1696502dea0A8C892Bb365ede4Ca3` |

- **Earns:** house mints rCHIP to your play wallet (mirrors ledger).
- **Shop spends:** *you* `burnSelf` from the play seat — house cannot burn your chips.
- **Ladder:** RiverClub upsert on sync. No SQL / no fillers.

## Faucet

Drip target ~`0.00045 ETH` (~multi-hand gas). Shuffle fees are prefunded on the table contract (~3 hands) when the house can.

## Optional SQL

`001_player_progress.sql` is optional backup only.
