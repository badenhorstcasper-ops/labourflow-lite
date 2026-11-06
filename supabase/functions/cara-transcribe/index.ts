// CARA speech-to-text. Accepts an audio blob (multipart/form-data, field "file")
// and returns { text } using Lovable AI Gateway's transcription endpoint.
// Nov 2026: signed-in + entitled users only, rate-limited, no upstream detail echoed.

import { guardAiCall, jsonResponse, corsFor, recordAiUsage, upstreamFailure, MESSAGES } from "../_shared/aiGuard.ts";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — comfortably covers 60 s of webm/mp4 audio

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  const guard = await guardAiCall(req, "transcribe");
  if (!guard.ok) return guard.response;

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    console.error("cara-transcribe: LOVABLE_API_KEY missing");
    return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse(req, { error: "expected_multipart" }, 400);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse(req, { error: "invalid_form" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResponse(req, { error: "missing_file" }, 400);
  }
  if (file.size === 0) {
    return jsonResponse(req, { error: "empty_file" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonResponse(req, { error: "file_too_large" }, 413);
  }
  const ftype = (file.type || "").toLowerCase();
  if (!ftype.startsWith("audio/")) {
    return jsonResponse(req, { error: "unsupported_type", type: ftype }, 400);
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

  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Lovable-API-Key": key },
      body: upstream,
    });
  } catch (e) {
    console.error("cara-transcribe: gateway unreachable", e);
    return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
  }

  if (!resp.ok) return upstreamFailure(req, resp, "cara-transcribe");

  const data = await resp.json().catch(() => null) as { text?: string } | null;
  const text = (data?.text ?? "").trim();

  if (!text) {
    return jsonResponse(req, { error: "empty_transcription" }, 502);
  }

  await recordAiUsage(guard, "transcribe");
  return jsonResponse(req, { text });
});
