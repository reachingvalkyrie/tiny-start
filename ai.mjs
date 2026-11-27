// Server-side proxy so your Anthropic API key never reaches the browser.
export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  const prompt = String(body.prompt || "").slice(0, 2000);
  if (!prompt) return new Response("Bad request", { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response("Server not configured", { status: 500 });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
      max_tokens: 1200,
      system:
        "You are a kind, accurate tutor for students and their parents. Keep everything age-appropriate and focused on studying. Politely decline anything unrelated to learning.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (r.status === 429) return new Response("Busy", { status: 429 });
  if (!r.ok) return new Response("Upstream error", { status: 502 });

  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return Response.json({ text });
};

export const config = { path: "/api/ai" };
