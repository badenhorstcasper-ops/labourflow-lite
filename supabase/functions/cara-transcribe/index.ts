// CARA speech-to-text. Accepts an audio blob (multipart/form-data, field "file")
// and returns { text } using Lovable AI Gateway's transcription endpoint.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — comfortably covers 60 s of webm/mp4 audio

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

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return new Response(JSON.stringify({ error: "expected_multipart" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_form" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "missing_file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size === 0) {
    return new Response(JSON.stringify({ error: "empty_file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "file_too_large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const ftype = (file.type || "").toLowerCase();
  if (!ftype.startsWith("audio/")) {
    return new Response(JSON.stringify({ error: "unsupported_type", type: ftype }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pick an extension OpenAI's transcribe model can infer the format from.
  const extMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
  };
  const baseType = ftype.split(";")[0].trim();
  const ext = extMap[baseType] ?? "webm";

  const upstream = new FormData();
  upstream.append("file", file, `recording.${ext}`);
  upstream.append("model", "openai/gpt-4o-mini-transcribe");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Lovable-API-Key": key },
    body: upstream,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    const status = resp.status === 429 || resp.status === 402 ? resp.status : 502;
    return new Response(JSON.stringify({ error: "transcription_failed", status: resp.status, detail }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await resp.json().catch(() => null) as { text?: string } | null;
  const text = (data?.text ?? "").trim();

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
