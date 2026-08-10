# Security Policy

## Supported versions

| Version / surface | Supported |
|---|---|
| Live app ([pi.sithunyein.com](https://pi.sithunyein.com)) | ✅ |
| `main` branch | ✅ |
| Testnet contracts on Base Sepolia | ✅ (best-effort) |
| Forks / unofficial deploys | ❌ |

pi River is a **Base Sepolia testnet** product. Still treat anything that can drain ETH/USDC from a house key, forge chip credit, or steal account progress as a real issue.

## In scope

- Auth / session abuse (Supabase Google OAuth, account takeover)
- Privilege escalation in `/api/*` (progress flush, chip claim, Megapot claim, daily bonus, chat)
- Chip purchase credit forgery (claim without a valid paid tx)
- Exposure of `PRIVATE_KEY`, service-role secrets, or play-wallet derivation material
- XSS / open redirect that can steal sessions or trigger on-chain actions
- Smart-contract issues in `contracts/src` that break custody, settlement, or decrypt ACL assumptions

## Out of scope

- Social-engineering of third-party accounts (Google, Vercel, Supabase)
- Denial-of-service / rate flooding without a novel auth bypass
- Issues only present on outdated local `.env` misconfiguration
- “Fun chips” economy balance / grind exploits that do not mint real chain value
- Known testnet limitations (faucet dependency, Inco/Megapot operator downtime)

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

1. Email **sithunyein.mailto@gmail.com** with:
   - Summary + impact
   - Steps to reproduce (or PoC)
   - Affected URL / commit / contract address if known
2. Optionally open a **private** security advisory on GitHub if available for this repo.

We aim to acknowledge within **72 hours** and share a remediation plan when we have enough detail.

## Safe harbor

If you research in good faith, avoid privacy violations / destructive exploits, and follow this process, we will not pursue legal action for the report itself.

## Secrets & ops hygiene

- Never commit `.env`, `.env.local`, or `PRIVATE_KEY`
- House wallet keys live only in Vercel / local secrets
- Prefer rotating any key that may have been pasted into chat, CI logs, or a public gist
