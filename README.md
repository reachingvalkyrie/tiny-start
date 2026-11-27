# Tiny Start

Works on Cloudflare Pages (recommended, free) and inside Telegram.

AI function: functions/api/ai.js
- Free AI: add a Workers AI binding named AI in your Pages project settings.
- Or Claude: set ANTHROPIC_API_KEY (and optionally CLAUDE_MODEL, default claude-haiku-5-5).
- Optional hard daily ceiling per device: add a KV binding named LIMITS (and optionally DAILY_LIMIT, default 10).

The notes tools (fill-in-the-blank and flashcards) need no AI and no setup.
The Netlify function in netlify/ only supports Claude (no free AI, no KV ceiling).

After any change, bump CACHE_VERSION in sw.js.
