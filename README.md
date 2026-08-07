# RIVER - Onchain Poker

The first poker room where the house cannot see your cards. Powered by Inco FHE.

## Quick Start

1. Clone and install
   ```
   git clone https://github.com/thesithunyein/river-poker.git
   cd river-poker
   npm install
   ```

2. Set up Supabase
   - Create a project at supabase.com
   - Enable Google OAuth provider
   - Copy your URL and anon key

3. Configure environment
   ```
   cp .env.local.template .env.local
   # Add your Supabase credentials
   ```

4. Run
   ```
   npm run dev
   ```

## Tech Stack
- Next.js 15
- Supabase Auth (Google)
- Tailwind CSS
- Inco FHE (encrypted hole cards)

## Deploy

Push to GitHub and connect to Vercel for automatic deployment.
