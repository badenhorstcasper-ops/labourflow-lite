import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Lightbulb, Sparkles, MessageCircleMore } from "lucide-react";
import { TOPICS, getTopicByKey } from "@/lib/cara/knowledge";
import { routeMessage } from "@/lib/cara/router";
import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";
import MicButton from "@/components/cara/MicButton";
const logoUrl = "/logo.png";
import { toast } from "sonner";

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
        navigate("/auth", { replace: true });
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
        {/* Topic chips — AARTO and Foreign Nationals grouped to reduce clutter */}
        <TopicChips busy={busy} onPick={(prompt) => send(prompt)} />

        {profileMissing && (
          <Card className="border-primary/40 bg-primary/10">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Add your company details so they appear on every document CARA creates.
              </p>
              <Button size="sm" asChild>
                <Link to="/account-app/profile">Complete profile →</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-[55vh] max-h-[65vh] overflow-y-auto rounded-lg border bg-card p-4"
        >
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
              {busy && (
                <div className="text-sm text-muted-foreground italic">CARA is thinking…</div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask CARA — type or tap the mic to talk…"
              rows={2}
              className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={busy}
            />
            <MicButton
              disabled={busy}
              onTranscript={(text) => {
                if (autoSend) {
                  send(text);
                } else {
                  setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
                }
              }}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input"
            />
            Auto-send voice messages when I stop talking (hands-free)
          </label>
        </form>

      </div>
    </AppShell>
  );
}

const AARTO_KEYS = ["aarto_overview", "licence_lost", "licence_hidden", "aarto_disclosure", "driver_policy", "driving_inherent_requirement"];
const VISA_KEYS = ["visa_overview", "visa_expired", "asylum_permit", "visa_verification", "visa_dismissal_fairness"];

function TopicChips({ busy, onPick }: { busy: boolean; onPick: (prompt: string) => void }) {
  const [openGroup, setOpenGroup] = useState<null | "aarto" | "visa">(null);
  const mainTopics = TOPICS.filter((t) => !AARTO_KEYS.includes(t.key) && !VISA_KEYS.includes(t.key));
  const aartoTopics = TOPICS.filter((t) => AARTO_KEYS.includes(t.key));
  const visaTopics = TOPICS.filter((t) => VISA_KEYS.includes(t.key));

  const chipCls = "px-3 py-1.5 rounded-full border bg-card hover:bg-muted text-sm transition disabled:opacity-50";
  const groupCls = "px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 text-sm font-medium transition disabled:opacity-50";
  const subCls = "px-3 py-1.5 rounded-full border bg-background hover:bg-muted text-xs transition disabled:opacity-50";

  const activeSubs = openGroup === "aarto" ? aartoTopics : openGroup === "visa" ? visaTopics : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {mainTopics.map((t) => (
          <button key={t.key} onClick={() => onPick(t.prompt)} disabled={busy} className={chipCls}>
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpenGroup(openGroup === "aarto" ? null : "aarto")}
          disabled={busy}
          className={groupCls}
          aria-expanded={openGroup === "aarto"}
        >
          Drivers / AARTO {openGroup === "aarto" ? "▲" : "▾"}
        </button>
        <button
          onClick={() => setOpenGroup(openGroup === "visa" ? null : "visa")}
          disabled={busy}
          className={groupCls}
          aria-expanded={openGroup === "visa"}
        >
          Foreign Nationals {openGroup === "visa" ? "▲" : "▾"}
        </button>
      </div>
      {activeSubs.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center rounded-lg border bg-muted/40 p-2">
          {activeSubs.map((t) => (
            <button
              key={t.key}
              onClick={() => { onPick(t.prompt); setOpenGroup(null); }}
              disabled={busy}
              className={subCls}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ greeting, onExample }: { greeting: string; onExample: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-6">
      <img src={logoUrl} alt="iNRECO" className="h-20 w-20 rounded-2xl" />
      <p className="text-base font-medium max-w-xl">{greeting}</p>
      <Card className="bg-muted/40 max-w-md">
        <CardContent className="p-3 text-sm text-muted-foreground">
          <span aria-hidden>👆</span> <span className="font-medium text-foreground">Tap a topic above</span> to get an instant, plain-English answer — or type your own question below.
        </CardContent>
      </Card>
      <Button variant="outline" size="sm" onClick={onExample}>
        <Lightbulb className="h-4 w-4 mr-1.5" /> Try an example
      </Button>
      <Card className="bg-muted/40 max-w-md">
        <CardContent className="p-3 text-xs text-muted-foreground">
          When you describe your situation, give as much detail as possible — what happened,
          when, previous warnings, and the employee's position. The more you tell CARA
          upfront, the faster she can help.
        </CardContent>
      </Card>
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
              onClick={() => onExpand(msg.groundingTopicKey!)}
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

// Tiny inline renderer for the **bold** segments and line breaks used by the
// knowledge base. We deliberately avoid a heavy markdown lib.
function renderMarkdownLite(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <div key={i}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
      {line === "" ? <span>&nbsp;</span> : null}
    </div>
  ));
}
