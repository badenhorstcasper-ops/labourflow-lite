// CARA AI fallback. Called only when the in-app knowledge base and template
// matcher both miss, OR when the user explicitly asks for more detail on a
// known topic. Uses Lovable AI Gateway with a tight SA-labour-law system
// prompt grounded with the in-app knowledge entry when one is supplied.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_BASE = `You are CARA, the Compliance and Relations Adviser inside the iNRECO app.
You help small South African employers with practical labour-relations questions.
Rules:
- Always assume South African law (LRA, BCEA, EEA, Code of Good Practice, CCMA Rules).
- Keep answers short and practical: 2–4 short paragraphs OR a numbered list of steps. No fluff.
- If the user describes a situation that maps to one of the available iNRECO documents, end your answer with a single tag on its own line: [[create:<template_key>]] — using one of the exact keys provided.
- You are NOT a lawyer. If the matter is unusual, urgent, or already at the Labour Court, say so and recommend speaking to a labour-law attorney.
- Never invent statutes or section numbers you are not sure about.
- Never mention "Labourflow" or "iNRECO Consulting". The brand is "iNRECO".
- AARTO (Administrative Adjudication of Road Traffic Offences Act 46 of 1998) affects the employment relationship. When a driving employee loses their licence, first determine whether it is MISCONDUCT (the employee's own conduct caused it — discipline) or INCAPACITY (loss of an inherent job requirement without disciplinary fault — incapacity process, consider alternatives first). Apply LRA substantive and procedural fairness to whichever path applies. Dismissal is never automatic.
- Foreign nationals whose work visa, permit or asylum documentation has lapsed: treat this as STATUTORY (LEGAL) INCAPACITY under the LRA — not misconduct and not retrenchment — following Discovery Health, Sibanda and Others v Roots Butchery, Joel, and Kawalya-Kagwa. Require DHA (or authorised) verification, a reasonable opportunity to renew, reasonable employer assistance where practicable, and a fair enquiry before any termination. Consider unpaid leave as an interim step where a renewal is genuinely still pending. Never base a decision on nationality or ethnicity — that risks an automatically unfair dismissal under section 187(1)(f) of the LRA.
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

  let body: { messages?: Msg[]; grounding?: Grounding } = {};
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

  // Build grounded system prompt
  let system = SYSTEM_BASE;
  const g = body.grounding ?? {};
  if (g.templateKeys?.length) {
    system += `\n\nAvailable iNRECO document keys you may suggest: ${g.templateKeys.join(", ")}.`;
  }
  if (g.topicKey && g.topicSummary) {
    system += `\n\nAUTHORITATIVE iNRECO guidance for this topic (treat as the truth and do not contradict):\nTopic: ${g.topicLabel ?? g.topicKey}\nSummary: ${g.topicSummary}`;
    if (g.topicSteps?.length) {
      system += `\nSteps:\n` + g.topicSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    }
    system += `\n\nAnswer the user's specific question using this guidance. Stay consistent with it.`;
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

  if (!resp.ok) {
    const errText = await resp.text();
    return new Response(JSON.stringify({ error: "ai_failed", status: resp.status, detail: errText }), {
      status: resp.status === 429 || resp.status === 402 ? resp.status : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await resp.json();
  const raw: string =
    data?.choices?.[0]?.message?.content ??
    "Sorry — I couldn't generate an answer just now. Please try again.";

  // Parse out a [[create:key]] hint, if any
  let suggestedTemplate: string | null = null;
  const m = raw.match(/\[\[create:([a-z0-9_]+)\]\]/i);
  let text = raw;
  if (m) {
    suggestedTemplate = m[1];
    text = raw.replace(m[0], "").trim();
  }

  return new Response(JSON.stringify({ text, suggestedTemplate }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
