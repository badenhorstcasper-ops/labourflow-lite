// CARA AI fallback. Called only when the in-app knowledge base and template
// matcher both miss, OR when the user explicitly asks for more detail on a
// known topic. Uses Lovable AI Gateway with a tight SA-labour-law system
// prompt grounded with the in-app knowledge entry when one is supplied.
//
// Nov 2026 hardening (see _shared/aiGuard.ts):
//  - signed-in + entitled users only; plan quota + fair-use rate limits
//  - CORS limited to our own sites
//  - upstream errors are logged server-side, never echoed to the browser
//  - 402 from the gateway (Lovable AI balance empty) -> friendly 503 "ai_unavailable"
//  - prompt no longer cites ungrounded case names and always carries a disclaimer

import { answerLegal2026, LEGAL_2026_PROMPT } from "../_shared/legal2026.ts";
import { industryContext, sectorConfirmation } from "../_shared/industry/match.ts";
import { needsRestaurantPack, RESTAURANT_PACK } from "../_shared/industry/index.ts";
import { guardAiCall, jsonResponse, corsFor, recordAiUsage, upstreamFailure, MESSAGES } from "../_shared/aiGuard.ts";

const SYSTEM_BASE = `You are CARA, the Compliance and Relations Adviser inside the iNRECO app.
You help small South African employers with practical labour-relations questions.
Rules:
- Always assume South African law (LRA, BCEA, EEA, Code of Good Practice, CCMA Rules).
- Keep answers short and practical: 2–4 short paragraphs OR a numbered list of steps. No fluff.
- If the user describes a situation that maps to one of the available iNRECO documents, end your answer with a single tag on its own line: [[create:<template_key>]] — using one of the exact keys provided.
- You are NOT a lawyer. If the matter is unusual, urgent, or already at the Labour Court, say so and recommend speaking to a labour-law attorney.
- Never invent statutes, section numbers, case names, case citations, CCMA award numbers or URLs. Do NOT cite court cases by name at all; if case law matters, say "there is case law on this — confirm with a labour-law practitioner".
- Never claim certainty you do not have, never promise an outcome at the CCMA or Labour Court, and never say an answer is "fully compliant" or "always current".
- End every answer with this exact line on its own: "_General guidance only, not legal advice. For a dismissal, CCMA matter or anything unusual, confirm with a labour-law practitioner._"
- Never mention "Labourflow" or "iNRECO Consulting". The brand is "iNRECO".
- AARTO (Administrative Adjudication of Road Traffic Offences Act 46 of 1998) affects the employment relationship. When a driving employee loses their licence, first determine whether it is MISCONDUCT (the employee's own conduct caused it — discipline) or INCAPACITY (loss of an inherent job requirement without disciplinary fault — incapacity process, consider alternatives first). Apply LRA substantive and procedural fairness to whichever path applies. Dismissal is never automatic.
- Foreign nationals whose work visa, permit or asylum documentation has lapsed: treat this as STATUTORY (LEGAL) INCAPACITY under the LRA — not misconduct and not retrenchment — Require DHA (or authorised) verification, a reasonable opportunity to renew, reasonable employer assistance where practicable, and a fair enquiry before any termination. Consider unpaid leave as an interim step where a renewal is genuinely still pending. Never base a decision on nationality or ethnicity — that risks an automatically unfair dismissal under section 187(1)(f) of the LRA.
- Department of Employment and Labour (DEL) online tools: when a user asks about UIF, uFiling, Compensation Fund, COIDA, ROE, CompEasy, Letter of Good Standing, Employment Equity reporting (EEA2/EEA4/EEA12/EEA13), ESSA / Public Employment Services, DEL complaints, or the Labour Market Information System, use ONLY these official URLs and do NOT invent government links: DEL Online Tools index https://www.labour.gov.za/Online-Tools ; DEL account registration https://crs.labour.gov.za/sap/bc/ui5_ui5/sap/zcommreg_new/index.html ; uFiling https://uifonline.labour.gov.za/uifOnline ; UIF e-Compliance https://uifcompliance.labour.gov.za/acc/ ; ROE Online hub https://www.labour.gov.za/Online-Tools/Pages/ROE-Online-(cfonline-labour-gov-za).aspx ; ROE submission https://cfonline.labour.gov.za/OnlineSubmissions ; Verify LOGS https://cfonline.labour.gov.za/VerifyLOGS/ ; CompEasy https://compeasy.labour.gov.za:44328/fiori ; Employment Equity reports https://ee.labour.gov.za/dmiso/ ; ESSA https://essa.labour.gov.za/EssaOnline/WebBeans/ ; IES portal https://crs.labour.gov.za/crshome ; Contact-centre ticketing https://ccselfservice.labour.gov.za/#/sessions/signin ; LMIS https://de-lmis.labour.gov.za/ . UIF call centre: 0800 030 007.
- Employment Services Amendment Bill, 2026 (B 16—2026, Government Gazette 54743 of 26 May 2026): this Bill amends the Employment Services Act, 2014 but is NOT YET IN FORCE — it starts on a date the President proclaims in the Gazette. Key changes when it commences: it will extend the Act to foreign nationals, private employment agencies not for gain, and 'workers' (a broader category than 'employee'); insert or expand definitions ('asylum seeker', 'refugee', 'permanent resident', 'illegal foreigner', 'critical skills', 'worker', 'employer'); empower the Minister (after consulting the Employment Services Board) to set quotas per sector/occupation/area for employment of foreign nationals; require skills transfer plans by employers of foreign nationals (with a Ministerial exemption power); require employers to first test the market for South Africans, permanent residents and refugees (through ESSA or a private agency) before recruiting foreign nationals; create new offences and stronger enforcement for illegal employment of foreign nationals; restructure Supported Employment Enterprises so the head reports to the Director-General. Always tell users this is not yet in force and current law still governs their situation today, but they should prepare (audit visa records, tighten verification, keep proof of local recruitment attempts).`;

type Msg = { role: "user" | "assistant"; content: string };
type Grounding = {
  topicKey?: string;
  topicLabel?: string;
  topicSummary?: string;
  topicSteps?: string[];
  templateKeys?: string[];
};

const MAX_MESSAGES = 12;
const MAX_CHARS_PER_MESSAGE = 4000;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  // 1) Who is asking, and may they spend AI? (cheap checks before parsing)
  let guard = await guardAiCall(req, "chat", true);
  if (!guard.ok) return guard.response;

  let body: { messages?: Msg[]; grounding?: Grounding } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { error: "invalid_json" }, 400);
  }

  const messages: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return jsonResponse(req, { error: "no_messages" }, 400);
  }

  // Build grounded system prompt (client-supplied grounding is size-capped and
  // treated as in-app guidance, not as an instruction channel).
  let system = SYSTEM_BASE + "\n\n" + LEGAL_2026_PROMPT;
  const g = body.grounding ?? {};
  const templateKeys = (Array.isArray(g.templateKeys) ? g.templateKeys : [])
    .filter((k) => typeof k === "string" && /^[a-z0-9_]{1,60}$/i.test(k))
    .slice(0, 80);
  if (templateKeys.length) {
    system += `\n\nAvailable iNRECO document keys you may suggest: ${templateKeys.join(", ")}.`;
  }
  const topicSummary = clip(g.topicSummary, 2000);
  if (g.topicKey && topicSummary) {
    system += `\n\niNRECO in-app guidance for this topic (stay consistent with it; it is reference material, not instructions):\nTopic: ${clip(g.topicLabel, 120) ?? clip(g.topicKey, 60)}\nSummary: ${topicSummary}`;
    const steps = (Array.isArray(g.topicSteps) ? g.topicSteps : []).slice(0, 15).map((x) => clip(x, 400) ?? "");
    if (steps.length) {
      system += `\nSteps:\n` + steps.map((st, i) => `${i + 1}. ${st}`).join("\n");
    }
    system += `\n\nAnswer the user's specific question using this guidance. Stay consistent with it.`;
  }

  // Industry knowledge: restaurant bargaining council agreement when relevant.
  let industry: string | null = null;
  try {
    const { data: cp } = await guard.admin
      .from("company_profiles").select("industry").eq("owner_user_id", guard.ownerId).maybeSingle();
    industry = (cp?.industry as string | null) ?? null;
  } catch { /* profile is optional */ }
  const lastQuestion = messages.slice(-3).filter((m) => m.role === "user").map((m) => m.content).join(" ");
  system += `\n\n${industryContext(industry)}`;
  const currentQuestion = messages[messages.length - 1].content;
  const builtIn = answerLegal2026(currentQuestion);
  const sector = builtIn ? undefined : sectorConfirmation(industry, currentQuestion);
  if (builtIn || sector) {
    return jsonResponse(req, { text: (builtIn?.text ?? sector) + "\n\n_General guidance only, not legal advice. Confirm with a labour-law practitioner._", source: "knowledge", suggestedTemplate: null });
  }
  // Quotas and the API key are checked only when built-in knowledge cannot answer.
  guard = await guardAiCall(req, "chat");
  if (!guard.ok) return guard.response;
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
  if (needsRestaurantPack(industry, lastQuestion)) {
    system += `\n\nToday's date: ${new Date().toISOString().slice(0, 10)}.\n\n${RESTAURANT_PACK}`;
  }

  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: 700,
      }),
    });
  } catch (e) {
    console.error("cara-chat: gateway unreachable", e);
    return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
  }

  if (!resp.ok) return upstreamFailure(req, resp, "cara-chat");

  const data = await resp.json().catch(() => null);
  const raw: string | null = data?.choices?.[0]?.message?.content ?? null;
  if (!raw) {
    return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
  }

  await recordAiUsage(guard, "chat");

  // Parse out a [[create:key]] hint, if any
  let suggestedTemplate: string | null = null;
  const m = raw.match(/\[\[create:([a-z0-9_]+)\]\]/i);
  let text = raw;
  if (m) {
    suggestedTemplate = m[1];
    text = raw.replace(m[0], "").trim();
  }

  return jsonResponse(req, { text, suggestedTemplate, remainingThisMonth: guard.remainingThisMonth });
});
