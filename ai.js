// Cloudflare Pages Function at /api/ai
// Uses free Workers AI if you added an "AI" binding, otherwise Claude if ANTHROPIC_API_KEY is set.
const SYSTEM =
  "You are a kind, accurate tutor for students and their parents. Keep everything age-appropriate and focused on studying. Politely decline anything unrelated to learning.";

export async function onRequestPost({ request, env }) {
  // Only accept calls from your own site
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response("Forbidden", { status: 403 });
  }

  let body;
  try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }

  const prompt = String(body.prompt || "").slice(0, 2000);
  if (!prompt) return new Response("Bad request", { status: 400 });
  const did = String(body.did || "").replace(/[^a-z0-9]/gi, "").slice(0, 40);

  // Optional hard daily ceiling per device. Needs a KV binding named LIMITS.
  if (env.LIMITS && did) {
    const day = new Date().toISOString().slice(0, 10);
    const key = `u:${did}:${day}`;
    const used = parseInt((await env.LIMITS.get(key)) || "0", 10);
    if (used >= parseInt(env.DAILY_LIMIT || "10", 10)) {
      return Response.json({ error: "daily_limit" }, { status: 429 });
    }
    await env.LIMITS.put(key, String(used + 1), { expirationTtl: 172800 });
  }

  const provider = env.AI_PROVIDER || (env.AI ? "workers" : "claude");
  let text = "";
  try {
    if (provider === "workers") {
      if (!env.AI) return new Response("Not configured", { status: 500 });
      const out = await env.AI.run(env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
      });
      text = String((out && out.response) || "");
    } else {
      if (!env.ANTHROPIC_API_KEY) return new Response("Not configured", { status: 500 });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.CLAUDE_MODEL || "claude-haiku-5-5",
          max_tokens: 1200,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (r.status === 429) return new Response("Busy", { status: 429 });
      if (!r.ok) return new Response("Upstream error", { status: 502 });
      const data = await r.json();
      text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    }
  } catch {
    return new Response("Upstream error", { status: 502 });
  }

  if (!text) return new Response("Upstream error", { status: 502 });
  return Response.json({ text });
}
