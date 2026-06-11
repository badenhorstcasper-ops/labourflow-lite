// CARA AI fallback. Called only when the in-app knowledge base and template
// matcher both miss. Uses Lovable AI Gateway with a tight SA-labour-law
// system prompt so answers stay on-topic and short.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are CARA, the Compliance and Relations Adviser inside the iNRECO app.
You help small South African employers with practical labour-relations questions.
Rules:
- Always assume South African law (LRA, BCEA, EEA, Code of Good Practice, CCMA Rules).
- Keep answers short and practical: 2–4 short paragraphs OR a numbered list of steps. No fluff.
- If the user describes a misconduct, performance, retrenchment, leave or contract situation, end with a one-line suggestion of which iNRECO document to create (warning, contract, dismissal, PIP, leave decision, NDA).
- You are NOT a lawyer. If the matter is unusual, urgent, or already at the Labour Court, say so and recommend speaking to a labour-law attorney.
- Never invent statutes or section numbers you are not sure about.
- Never mention "Labourflow" or "iNRECO Consulting". The brand is "iNRECO".`;

type Msg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { messages?: Msg[] } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "no_messages" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return new Response(JSON.stringify({ error: "ai_failed", status: resp.status, detail: errText }), {
      status: resp.status === 429 || resp.status === 402 ? resp.status : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await resp.json();
  const text: string =
    data?.choices?.[0]?.message?.content ??
    "Sorry — I couldn't generate an answer just now. Please try again.";

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
