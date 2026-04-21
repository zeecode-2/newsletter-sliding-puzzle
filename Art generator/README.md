# Art Description Generator

A production-ready Node.js/Express web app that generates SEO and AEO-optimized product descriptions for artwork using Claude AI. Fill in your artwork details and receive a complete 5-layer optimization package in seconds.

## Features

- **Layer 1 — SEO Visibility:** `llms.txt` template, JSON-LD schema markup, `robots.txt` with AI crawler rules, performance tips
- **Layer 2 — Description SEO:** SEO title, meta description, URL slug, keyword analysis, SEO score with breakdown
- **Layer 3 — Content Writer:** Full HOOK · STORY · MEDIUM · OFFER · VSL copywriting structure with engagement metrics
- **Layer 4 — GEO:** Geographic keywords, location-enhanced title variants, regional meta descriptions
- **Layer 5 — AEO:** AI discoverability score, featured snippet Q&A, AEO checklist, AI-optimized summary

All output sections include a one-click **Copy** button.

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Add your API key to .env
ANTHROPIC_API_KEY=your_key_here

# 4. Start the server
npm start
```

Open `http://localhost:3000` in your browser.

Use `npm run dev` during development for auto-reload via nodemon.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development` or `production` |

## Project Structure

```
├── server.js           # Express app, middleware, routing
├── routes/
│   └── generate.js     # POST /api/generate — Claude API integration
├── public/
│   ├── index.html      # Single-page UI
│   ├── css/styles.css  # Dark theme stylesheet
│   └── js/app.js       # Form handling and result rendering
├── .env.example
└── package.json
```

## API

### `POST /api/generate`

**Body (JSON):**

| Field | Required | Description |
|---|---|---|
| `artworkTitle` | Yes | Title of the artwork |
| `artistName` | Yes | Artist or brand name |
| `medium` | Yes | Medium and materials used |
| `description` | Yes | Inspiration / brief description |
| `dimensions` | No | e.g. `24" × 36"` |
| `edition` | No | Original, Limited Edition Print, etc. |
| `price` | No | Price in USD |
| `style` | No | Style or movement |
| `keywords` | No | Target keywords |
| `location` | No | City or region for geo SEO |
| `brand` | No | Gallery or brand name |
| `websiteUrl` | No | Your website URL |

**Response:**

```json
{
  "success": true,
  "data": {
    "layer1_seo_visibility": { ... },
    "layer2_description_seo": { ... },
    "layer3_content_writer": { ... },
    "layer4_seo_geo": { ... },
    "layer5_aeo": { ... }
  }
}
```

## Rate Limiting

The `/api` endpoint is limited to **15 requests per 15 minutes** per IP address.

## Tech Stack

- **Backend:** Node.js, Express, Helmet, express-rate-limit
- **AI:** Claude Sonnet (`claude-sonnet-4-6`) via Anthropic SDK with prompt caching
- **Frontend:** Vanilla HTML/CSS/JS, Inter + JetBrains Mono fonts
