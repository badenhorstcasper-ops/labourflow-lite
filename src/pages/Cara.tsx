import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  MessageCircleMore,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { TOPICS, getTopicByKey } from "@/lib/cara/knowledge";
import { routeMessage } from "@/lib/cara/router";
import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";
import MicButton from "@/components/cara/MicButton";
const logoUrl = "/logo.png";
import { toast } from "sonner";
import { takeGuestDraft } from "@/lib/appLaunch";
import { signInPath } from "@/lib/authRedirect";

const AUTO_SEND_KEY = "cara.voice.autoSend";


type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  templateKeys?: string[];
  followUps?: string[];
  groundingTopicKey?: string; // set on user msgs that hit knowledge; reused for "ask for more detail"
  canExpand?: boolean;        // assistant msg has an "ask CARA for more detail" button
};

export default function CaraPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [profileMissing, setProfileMissing] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [autoSend, setAutoSend] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTO_SEND_KEY) === "1";
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_SEND_KEY, autoSend ? "1" : "0");
    }
  }, [autoSend]);


  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate(signInPath("/app"), { replace: true });
        return;
      }
      const { data: ownerData } = await supabase.rpc("current_account_owner");
      const owner = ownerData as unknown as string;
      const { data } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("owner_user_id", owner)
        .maybeSingle();
      const name = (data as { company_name?: string } | null)?.company_name?.trim() || "";
      setCompanyName(name);
      setProfileMissing(!name);
      setReady(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // If they typed a question before signing up, ask it for them now.
  const draftDone = useRef(false);
  useEffect(() => {
    if (!ready || draftDone.current) return;
    draftDone.current = true;
    const draft = takeGuestDraft();
    if (draft) void send(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const greeting = useMemo(() => {
    const who = companyName || "there";
    return `Hello, ${who}. I'm CARA, your Compliance and Relations Adviser. Ask me anything about South African labour compliance for your business.`;
  }, [companyName]);

  async function callAi(history: ChatMsg[], groundingTopicKey?: string) {
    const topic = groundingTopicKey ? getTopicByKey(groundingTopicKey) : undefined;
    const grounding = topic
      ? {
          topicKey: topic.key,
          topicLabel: topic.label,
          topicSummary: topic.summary,
          topicSteps: topic.steps,
          templateKeys: TEMPLATE_REGISTRY.map((t) => t.key),
        }
      : {
          templateKeys: TEMPLATE_REGISTRY.map((t) => t.key),
        };
    const payload = {
      messages: history.map((m) => ({ role: m.role, content: m.text })),
      grounding,
    };
    const { data, error } = await supabase.functions.invoke("cara-chat", { body: payload });
    if (error) throw error;
    const d = data as { text?: string; suggestedTemplate?: string } | null;
    return {
      text: d?.text || "Sorry — I couldn't generate an answer just now. Please try again.",
      suggestedTemplate: d?.suggestedTemplate || undefined,
    };
  }

  async function expandWithAi(groundingTopicKey: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { text, suggestedTemplate } = await callAi(messages, groundingTopicKey);
      const templateKeys = suggestedTemplate
        ? [suggestedTemplate]
        : getTopicByKey(groundingTopicKey)?.relatedTemplates ?? [];
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text, templateKeys },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("CARA had a problem: " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text: clean };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    const decision = routeMessage(clean);

    if (decision.source === "knowledge") {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: decision.text,
          templateKeys: decision.templateKeys,
          followUps: decision.followUps,
          groundingTopicKey: decision.topic.key,
          canExpand: true,
        },
      ]);
      setBusy(false);
      return;
    }

    if (decision.source === "template") {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: decision.text,
          templateKeys: [decision.templateKey],
        },
      ]);
      setBusy(false);
      return;
    }

    // AI fallback (no grounding topic — unknown query)
    try {
      const { text: aiText, suggestedTemplate } = await callAi(next);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: aiText,
          templateKeys: suggestedTemplate ? [suggestedTemplate] : undefined,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("CARA had a problem: " + msg);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I couldn't reach the AI just now. You can still tap a topic above for built-in guidance.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function tryExample() {
    send("An employee was rude to a customer yesterday. Can I issue a final written warning?");
  }

  if (!ready) {
    return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {profileMissing && (
          <Card className="border-primary/40 bg-primary/10">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Add your company details so they appear on every document CARA creates.
              </p>
              <Button size="sm" asChild className="w-full sm:w-auto">
                <Link to="/account-app/profile">Complete profile →</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <section aria-labelledby="cara-heading" className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="" className="h-11 w-11 rounded-lg" />
              <div className="min-w-0">
                <h1 id="cara-heading" className="text-xl font-bold">Ask CARA</h1>
                <p className="text-sm text-muted-foreground">Your pocket labour consultant</p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-[240px] max-h-[48vh] overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <EmptyState greeting={greeting} onExample={tryExample} />
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    navigate={navigate}
                    onFollowUp={(q) => send(q)}
                    onExpand={(topicKey) => expandWithAi(topicKey)}
                    busy={busy}
                  />
                ))}
                {busy && <div className="text-sm italic text-muted-foreground">CARA is thinking…</div>}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t bg-background/50 p-3"
          >
            <label htmlFor="cara-question" className="sr-only">Ask CARA a question</label>
            <textarea
              id="cara-question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Describe what happened at work…"
              rows={3}
              className="w-full resize-none rounded-lg border bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={busy}
            />
            <div className="mt-2 flex items-center gap-2">
              <MicButton
                disabled={busy}
                onTranscript={(text) => {
                  if (autoSend) send(text);
                  else setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
                }}
              />
              <label className="mr-auto flex min-h-11 items-center gap-2 px-1 text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={autoSend}
                  onChange={(e) => setAutoSend(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Send voice automatically
              </label>
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send question">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </section>

        <TopicBrowser busy={busy} onPick={(prompt) => send(prompt)} />
      </div>
    </AppShell>
  );
}

const AARTO_KEYS = ["aarto_overview", "licence_lost", "licence_hidden", "aarto_disclosure", "driver_policy", "driving_inherent_requirement"];
const VISA_KEYS = ["visa_overview", "visa_expired", "asylum_permit", "visa_verification", "visa_dismissal_fairness"];
const GOV_KEYS = ["gov_tools_overview", "ufiling", "compensation_fund", "employment_equity_reports", "essa_public_employment", "labour_complaint", "labour_market_stats", "esa_bill_2026"];

const TOPIC_GROUPS = [
  { key: "conduct", label: "Conduct & discipline", helper: "Warnings, hearings, grievances and workplace conduct", keys: ["warning", "hearing", "grievance", "suspension", "harassment", "ccma", "union"] },
  { key: "attendance", label: "Attendance, leave & working time", helper: "Absence, sick leave, hours and overtime", keys: ["awol", "sick_leave", "hours"] },
  { key: "employment", label: "Performance & employment changes", helper: "Performance, probation, incapacity, resignation and retrenchment", keys: ["performance", "probation", "incapacity", "resignation", "retrenchment"] },
  { key: "aarto", label: "Drivers & AARTO", helper: "Driving offences, licence checks and fleet policies", keys: AARTO_KEYS },
  { key: "visa", label: "Foreign nationals", helper: "Visa checks, expiry, permits and fair process", keys: VISA_KEYS },
  { key: "gov", label: "Government tools & links", helper: "UIF, Compensation Fund, Employment Equity and official services", keys: GOV_KEYS },
] as const;

function TopicBrowser({ busy, onPick }: { busy: boolean; onPick: (prompt: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? TOPICS.filter((t) =>
        t.label.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        (t.summary?.toLowerCase().includes(q) ?? false)
      )
    : [];

  return (
    <section aria-labelledby="topics-heading" className="overflow-hidden rounded-lg border bg-card">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="h-14 w-full justify-between rounded-none px-4"
      >
        <span id="topics-heading" className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Browse common topics</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </Button>

      {expanded && (
        <div className="border-t p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="topic-search" className="sr-only">Search CARA topics</label>
            <input
              id="topic-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics"
              className="h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {q ? (
            <div className="divide-y overflow-hidden rounded-lg border">
              {matches.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No matching topics. Describe the situation to CARA above.</p>
              ) : matches.map((topic) => (
                <Button key={topic.key} variant="ghost" disabled={busy} onClick={() => { onPick(topic.prompt); setQuery(""); setExpanded(false); }} className="h-auto min-h-14 w-full justify-between rounded-none px-4 py-3 text-left font-medium whitespace-normal">
                  {topic.label}<ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Button>
              ))}
            </div>
          ) : (
            <div className="divide-y overflow-hidden rounded-lg border">
              {TOPIC_GROUPS.map((group) => {
                const isOpen = openGroup === group.key;
                const topics = TOPICS.filter((topic) => group.keys.includes(topic.key as never));
                return (
                  <div key={group.key}>
                    <Button variant="ghost" onClick={() => setOpenGroup(isOpen ? null : group.key)} aria-expanded={isOpen} className="h-auto min-h-14 w-full justify-between rounded-none px-4 py-3 text-left whitespace-normal">
                      <span><span className="block font-semibold">{group.label}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{group.helper}</span></span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </Button>
                    {isOpen && (
                      <div className="border-t bg-background/50 px-2 py-1">
                        {topics.map((topic) => (
                          <Button key={topic.key} variant="ghost" disabled={busy} onClick={() => { onPick(topic.prompt); setExpanded(false); setOpenGroup(null); }} className="h-auto min-h-14 w-full justify-between rounded-md px-3 py-3 text-left text-sm font-medium whitespace-normal">
                            {topic.label}<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyState({ greeting, onExample }: { greeting: string; onExample: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 py-2 text-left">
      <p className="text-base font-medium leading-relaxed">{greeting}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Tell me what happened, when it happened, and whether there were previous warnings. I’ll guide you step by step.
      </p>
      <Button variant="outline" size="sm" onClick={onExample} className="mt-1 w-full justify-start sm:w-auto">
        <Lightbulb className="h-4 w-4" /> Show me an example
      </Button>
    </div>
  );
}

function MessageBubble({
  msg,
  navigate,
  onFollowUp,
  onExpand,
  busy,
}: {
  msg: ChatMsg;
  navigate: (to: string) => void;
  onFollowUp: (q: string) => void;
  onExpand: (topicKey: string) => void;
  busy: boolean;
}) {
  const isUser = msg.role === "user";
  const templates = (msg.templateKeys ?? [])
    .map((k) => TEMPLATE_REGISTRY.find((t) => t.key === k))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {renderMarkdownLite(msg.text)}

        {!isUser && templates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button
                key={template.key}
                size="sm"
                onClick={() => navigate(`/account-app/generate?template=${template.key}`)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Create the {template.name.toLowerCase()}
              </Button>
            ))}
          </div>
        )}

        {!isUser && msg.canExpand && msg.groundingTopicKey && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => msg.groundingTopicKey && onExpand(msg.groundingTopicKey)}
            >
              <MessageCircleMore className="h-3.5 w-3.5 mr-1.5" />
              Ask CARA for more detail
            </Button>
          </div>
        )}

        {!isUser && msg.followUps && msg.followUps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {msg.followUps.map((q) => (
              <button
                key={q}
                onClick={() => onFollowUp(q)}
                disabled={busy}
                className="text-xs px-2 py-1 rounded-full border bg-background hover:bg-muted transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny inline renderer for **bold**, [label](url) links and line breaks.
// We deliberately avoid a heavy markdown lib.
function renderMarkdownLite(text: string) {
  const lines = text.split("\n");
  // Combined tokenizer: bold OR markdown link
  const tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  return lines.map((line, i) => (
    <div key={i}>
      {line.split(tokenRe).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
        if (linkMatch) {
          return (
            <a
              key={j}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary hover:opacity-80 break-all"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={j}>{part}</span>;
      })}
      {line === "" ? <span>&nbsp;</span> : null}
    </div>
  ));
}

