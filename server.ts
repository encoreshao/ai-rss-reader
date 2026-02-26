import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Parser from "rss-parser";
import Database from "better-sqlite3";
import { INITIAL_FEEDS } from "./src/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("rss_reader.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    xmlUrl TEXT NOT NULL UNIQUE,
    htmlUrl TEXT,
    type TEXT DEFAULT 'rss',
    category TEXT DEFAULT 'General'
  )
`);

// Seed initial feeds if empty
const count = db.prepare("SELECT COUNT(*) as count FROM feeds").get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare("INSERT INTO feeds (name, xmlUrl, htmlUrl, type, category) VALUES (?, ?, ?, ?, ?)");
  const transaction = db.transaction((feeds) => {
    for (const feed of feeds) {
      insert.run(feed.name, feed.xmlUrl, feed.htmlUrl || null, 'rss', feed.category || 'Tech');
    }
  });
  transaction(INITIAL_FEEDS);
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  timeout: 15000,
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'contentSnippet'],
    ],
  },
});

async function startServer() {
  const app = express();
  const PORT = 3005;

  app.use(express.json());

  // Helper to convert X.com to Nitter RSS
  const convertXToNitter = (url: string) => {
    if (url.includes('x.com') || url.includes('twitter.com')) {
      const username = url.split('/').pop();
      if (username) {
        return `https://nitter.net/${username}/rss`;
      }
    }
    return url;
  };

  // API route to get all feeds
  app.get("/api/feeds", (req, res) => {
    const feeds = db.prepare("SELECT * FROM feeds").all();
    res.json(feeds);
  });

  // API route to add a feed
  app.post("/api/feeds", (req, res) => {
    const { name, url, type, category } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }

    const xmlUrl = type === 'x' ? convertXToNitter(url) : url;

    try {
      const info = db.prepare("INSERT INTO feeds (name, xmlUrl, type, category) VALUES (?, ?, ?, ?)").run(name, xmlUrl, type || 'rss', category || 'General');
      res.json({ id: info.lastInsertRowid, name, xmlUrl, type: type || 'rss', category: category || 'General' });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Feed already exists" });
      } else {
        res.status(500).json({ error: "Failed to add feed" });
      }
    }
  });

  // API route to delete a feed
  app.delete("/api/feeds/:id", (req, res) => {
    db.prepare("DELETE FROM feeds WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // API route to fetch and parse RSS feed
  app.get("/api/rss", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // Use native fetch for better TLS compatibility than the default rss-parser client
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const xml = await response.text();

      // Basic check to see if it's actually XML/RSS
      if (!xml.trim().startsWith('<')) {
        throw new Error("Response is not a valid XML/RSS feed (received non-XML content)");
      }

      const feed = await parser.parseString(xml);
      res.json(feed);
    } catch (error: any) {
      console.error(`Error parsing RSS from ${url}:`, error.message);

      // Fallback to direct parser.parseURL if fetch fails for some reason
      try {
        console.log(`Attempting fallback for ${url}...`);
        const feed = await parser.parseURL(url);
        return res.json(feed);
      } catch (fallbackError: any) {
        res.status(500).json({
          error: "Failed to parse RSS feed",
          details: error.message,
          fallbackDetails: fallbackError.message
        });
      }
    }
  });

  // API route to fetch multiple feeds for digests
  app.post("/api/digest", async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "URLs array is required" });
    }

    try {
      // Limit to first 10 for performance in this demo
      const targetUrls = urls.slice(0, 10);
      const feeds = await Promise.all(
        targetUrls.map(async (url) => {
          try {
            // Use fetch for better compatibility
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

            const xml = await response.text();
            if (!xml.trim().startsWith('<')) throw new Error("Not XML");

            const feed = await parser.parseString(xml);
            return { url, items: feed.items.slice(0, 3) }; // Only top 3 items per feed
          } catch (e) {
            // Fallback to parseURL
            try {
              const feed = await parser.parseURL(url);
              return { url, items: feed.items.slice(0, 3) };
            } catch (fallbackError) {
              return { url, items: [], error: true };
            }
          }
        })
      );
      res.json(feeds);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate digest data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { port: 0 },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
