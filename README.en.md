# AI RSS Reader

Fetch the latest articles from top tech blogs recommended by Andrej Karpathy, with support for aggregated subscriptions, including X (Twitter) accounts, smart summaries, and daily news digest.

[中文](./README.md)

> Information sources include [HN Popularity Contest](https://refactoringenglish.com/tools/hn-popularity/), covering paulgraham.com, krebsonsecurity.com, simonwillison.net, daringfireball.net, etc.

---

## Features

- **Multi-source aggregation** — subscribe to RSS feeds and X (Twitter) accounts, all in one interface
- **Category management** — organise subscriptions by Engineering, AI, Security, Tech, and more
- **AI article summaries** — one click to generate a concise Gemini-powered summary for any article
- **Daily / weekly digest** — generate an editorial-style AI digest (think Morning Brew) from your current feed
- **CSV export** — export the current article list for archiving or further processing
- **Graceful degradation** — works fully without a Gemini API key; AI buttons show a toast instead of crashing

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Framer Motion |
| Backend | Node.js · Express · tsx |
| Database | SQLite (better-sqlite3) |
| Build | Vite 6 |
| AI | Google Gemini (`@google/genai`) |

## Getting Started

**Requirements:** Node.js `>=22.12.0` (nvm recommended)

```bash
# Switch to the correct Node version
nvm use

# Install dependencies
npm install

# (Optional) Configure Gemini API key to enable AI features
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key_here

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The app works perfectly without an API key — feeds load normally and AI features (summaries and digest) display a toast prompt when clicked.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Express + Vite HMR) |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type checking |

## Project Structure

```
├── server.ts          # Express server (RSS proxy + Vite middleware)
├── src/
│   ├── App.tsx        # Main UI and all interaction logic
│   ├── constants.ts   # Default feed list (60+ curated blogs)
│   └── services/
│       └── geminiService.ts  # Gemini AI wrapper
├── vite.config.ts     # Vite configuration
├── .nvmrc             # Pinned Node version (22.18.0)
└── rss_reader.db      # SQLite database (auto-created on first run)
```

## Adding Feeds

Click the **+** button in the top-right of the sidebar. Supports both RSS URLs and X (Twitter) profile URLs. The app ships with 60+ curated English-language blogs as default subscriptions.
