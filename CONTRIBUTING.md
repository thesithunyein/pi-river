# Contributing

Thanks for interest in **pi River**. This repo is the live Jam / product surface for confidential Hold’em on Inco + Megapot.

## Before you start

1. Read [README.md](./README.md) (setup + architecture)
2. Skim [SECURITY.md](./SECURITY.md) — do not file public issues for vulns
3. Use **Base Sepolia** only; never point house keys at mainnet for experimentation

## Dev setup

```bash
bun install
cp .env.example .env.local
# fill Supabase + contract addresses; keep PRIVATE_KEY local only
bun run dev
```

Contracts: Foundry under `contracts/`. DB: `supabase/migrations` or `FULL_SETUP.sql`.

## Pull requests

- Keep PRs focused (one concern)
- Match existing TypeScript / Tailwind patterns in `src/`
- Do not commit secrets, `.tmp_*` dumps, or generated `contracts/out`
- For UI: prefer the existing brand (`mi-mark`, product chrome) over new visual systems
- Note testnet / house-wallet impact in the PR body when touching `/api/chips`, `/api/megapot`, or settle paths

## Issues

Bug reports welcome as GitHub issues. Include:

- URL / route
- Wallet / auth state (play wallet vs MetaMask), omit private keys
- Expected vs actual
- Tx hash if on-chain

Security → [SECURITY.md](./SECURITY.md) only.

## License

By contributing, you agree your contributions are licensed under the MIT License ([LICENSE](./LICENSE)).
