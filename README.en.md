# AI RSS Reader

Fetch the latest articles from top tech blogs recommended by Andrej Karpathy, with aggregated subscriptions, X (Twitter) accounts, multi-model AI summaries, and an editorial-style daily digest.

[中文](./README.md)

> Sources include the [HN Popularity Contest](https://refactoringenglish.com/tools/hn-popularity/) list — paulgraham.com, krebsonsecurity.com, simonwillison.net, daringfireball.net, and more.

---

## Features

- **Multi-source aggregation** — subscribe to RSS feeds and X (Twitter) accounts, all in one interface
- **Category management** — organise subscriptions by Engineering, AI, Security, Tech, and more
- **Article reader panel** — click any article card to read the full content in a right-side panel; falls back to an inline iframe when the RSS feed provides no body content
- **AI article summaries** — one-click summaries powered by your chosen AI model
- **Daily / weekly digest** — generate an editorial-style AI digest (think Morning Brew) from your current feed
- **Multi-provider AI** — switch between Gemini, Claude, and OpenAI from the settings UI; API keys are stored only in your browser's localStorage
- **CSV export** — export the current article list for archiving or further processing
- **Graceful degradation** — works fully without an API key; clicking AI features opens the settings modal instead of crashing

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Framer Motion |
| Backend | Node.js · Express · tsx |
| Database | SQLite (better-sqlite3) |
| Build | Vite 6 |
| AI | Gemini (`@google/genai`) · Claude (`@anthropic-ai/sdk`) · OpenAI (`openai`) |

## Getting Started

**Requirements:** Node.js `>=22.12.0` (nvm recommended)

```bash
# Switch to the correct Node version
nvm use

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Click the **⚙ gear icon** in the header toolbar, select your AI provider, and paste your API key to enable AI features. The key is stored only in browser localStorage — never written to disk.

> The app works fine without an API key — feeds load normally and clicking any AI feature opens the settings modal automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Express + Vite HMR) |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type checking |

## AI Provider Setup

| Provider | Model | Get Key |
|----------|-------|---------|
| Gemini | `gemini-2.0-flash` | [Google AI Studio](https://aistudio.google.com/apikey) |
| Claude | `claude-opus-4-5` | [Anthropic Console](https://console.anthropic.com/) |
| OpenAI | `gpt-4o` | [OpenAI Platform](https://platform.openai.com/api-keys) |

Keys travel: **browser → your local Express server → AI provider API**. No third-party servers involved.

## Project Structure

```
├── server.ts          # Express server (RSS proxy + AI routes + Vite middleware)
├── src/
│   ├── App.tsx        # Main UI and all interaction logic
│   ├── constants.ts   # Default feed list (60+ curated blogs)
│   └── services/
│       └── aiService.ts  # Multi-provider AI service wrapper
├── vite.config.ts     # Vite configuration
├── .nvmrc             # Pinned Node version (22.18.0)
└── rss_reader.db      # SQLite database (auto-created on first run, git-ignored)
```

## Adding Feeds

Click the **+** button in the top-right of the sidebar. Supports both RSS URLs and X (Twitter) profile URLs. The app ships with 60+ curated English-language blogs as default subscriptions.
