# UR Intelligence

A simple, private AI chat that runs entirely in your browser. Bring your own [OpenRouter](https://openrouter.ai) API key and chat with free models.

- **Frontend only.** No backend, serverless functions, database, or accounts.
- **Your key, your browser.** Every visitor supplies their own key. Nothing is shared and no key is ever built into the app.
- **Free models only.** Auto mode uses OpenRouter's `openrouter/free` router; Manual mode lists the current `:free` chat models. The app never switches you to a paid model.

Repository: <https://github.com/ismailabs/uri>

## Features

| | |
|---|---|
| Chat | Streaming responses over OpenRouter's chat completions API, with a Stop button |
| Conversations | Multiple chats, persistent history in `localStorage`, new chat, delete chat, clear chat, export as JSON |
| Models | **Auto** (`openrouter/free`) or **Manual**: a searchable list of `:free` models fetched live from `GET /api/v1/models` (nothing hardcoded) |
| Replies | Markdown (GFM tables, lists), syntax-highlighted code blocks, copy response, copy code, regenerate |
| Errors | Clear messages and recovery actions for invalid keys, rate limits, unavailable models, provider and network failures, and mid-stream errors |
| UI | Responsive (desktop sidebar, mobile drawer), light and dark themes |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Open the app, paste an OpenRouter API key (create one at <https://openrouter.ai/settings/keys>), and start chatting. No `.env` file is needed.

Other scripts:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm test           # unit tests (Vitest)
```

## How your key and data are handled

| Item | Where it lives |
|---|---|
| API key | **In memory only** by default. It is gone when you close or reload the tab. |
| API key (optional) | Saved to `localStorage` **only** if you tick "Remember this key on this device". A warning is shown, and **Settings → Remove key** deletes it. |
| Conversations | Browser `localStorage` (`ur.chats.v1`). Only known message fields are written, and the key is never part of this data. |
| Exports | Conversations only. Exports never contain the key. |
| Network | Requests go from your browser straight to `openrouter.ai`. There is no proxy. |

Notes:

- Free models are served by third-party providers that may log prompts. Don't share sensitive information.
- Model output is rendered as Markdown with raw HTML disabled, and remote images are shown as plain links so a response can't make your browser contact a third party.
- `vercel.json` sets a strict Content-Security-Policy (`connect-src` is limited to `self` and `https://openrouter.ai`, no inline scripts) and other security headers.
- Anyone with access to your browser profile can read `localStorage`. Don't use "Remember" on shared computers.

## OpenRouter integration

- Model catalogue: `GET https://openrouter.ai/api/v1/models` (public, no key sent). Filtered to IDs ending in `:free` that take and return text and have zero pricing.
- Chat: `POST https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <your key>` and `stream: true`. The SSE stream is parsed incrementally; `: OPENROUTER PROCESSING` comment lines are ignored, `[DONE]` ends the stream, and mid-stream `error` chunks are surfaced while keeping the partial reply.
- Safety net: the client refuses to send a request to any model that isn't `openrouter/free` or a `:free` model. When a manual model fails, the app offers a **Switch to Auto and retry** button; it never switches on its own.
- Each request sends the system prompt plus the most recent messages up to about 60,000 characters (roughly 15k tokens), so very long chats keep working on models with small context windows.
- Free models have strict rate limits. A 429 shows a message and a Retry button.

## Project structure

```
index.html
public/            favicon, theme-init.js (applies the theme before first paint)
src/
  main.tsx, App.tsx, index.css
  components/      Sidebar, ChatView, MessageView, Markdown, ModelPicker, SettingsDialog, KeyForm, ...
  hooks/           useConversations (state + persistence), useChatRunner (streaming)
  lib/             openrouter.ts (API + SSE), storage.ts, chat.ts, types.ts, clipboard.ts
tests/             Vitest unit tests
vercel.json        build settings + security headers
```

Stack: React, TypeScript, Vite, Tailwind CSS v4. Runtime dependencies beyond React: `react-markdown`, `remark-gfm`, `rehype-highlight`, and the bundled Geist fonts.

## Deploy to Vercel

1. Push this project to GitHub (see below).
2. In Vercel choose **Add New → Project** and import `ismailabs/uri`.
3. Confirm the settings (they are also set in `vercel.json`):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Do not add any environment variables.** Click **Deploy**.

Or with the CLI:

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

## Push to GitHub

The repository `https://github.com/ismailabs/uri` is empty. From the project folder:

```bash
git init
git add .
git commit -m "Add UR Intelligence"
git branch -M main
git remote add origin https://github.com/ismailabs/uri.git
git push -u origin main
```

## Troubleshooting

- **"Could not reach OpenRouter"**: check your connection, then try disabling VPN or ad-blocker extensions that block `openrouter.ai`.
- **"OpenRouter rejected your API key"**: paste the key again in Settings. Keys start with `sk-or-`.
- **"Rate limit reached"**: free models allow only a limited number of requests. Wait and retry, or try a different model.
- **Model list empty or failing**: use **Refresh** in the model picker. The list is fetched live and changes over time.
- **History not saving**: the browser is blocking or has filled `localStorage` (for example in some private modes). Use Settings → Export to keep your chats.
