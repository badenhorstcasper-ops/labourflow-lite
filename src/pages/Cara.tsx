import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Lightbulb, Sparkles } from "lucide-react";
import { TOPICS } from "@/lib/cara/knowledge";
import { routeMessage } from "@/lib/cara/router";
import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";
const logoUrl = "/logo.png";
import { toast } from "sonner";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  templateKey?: string;
};

export default function CaraPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [profileMissing, setProfileMissing] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text: clean };
    setMessages((m) => [...m, userMsg]);
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
          templateKey: decision.topic.templateKey,
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
          templateKey: decision.templateKey,
        },
      ]);
      setBusy(false);
      return;
    }

    // AI fallback
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));
      const { data, error } = await supabase.functions.invoke("cara-chat", {
        body: { messages: history },
      });
      if (error) throw error;
      const aiText =
        (data as { text?: string } | null)?.text ||
        "Sorry — I couldn't generate an answer just now. Please try again.";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: aiText },
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
        {/* Topic chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => send(t.prompt)}
              disabled={busy}
              className="px-3 py-1.5 rounded-full border bg-card hover:bg-muted text-sm transition disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
        </div>

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
                <MessageBubble key={m.id} msg={m} navigate={navigate} />
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
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask CARA about a labour issue…"
            rows={2}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
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
}: {
  msg: ChatMsg;
  navigate: (to: string) => void;
}) {
  const isUser = msg.role === "user";
  const template = msg.templateKey
    ? TEMPLATE_REGISTRY.find((t) => t.key === msg.templateKey)
    : undefined;
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
        {template && !isUser && (
          <div className="mt-3">
            <Button
              size="sm"
              onClick={() => navigate(`/account-app/generate?template=${template.key}`)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Create the {template.name.toLowerCase()}
            </Button>
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
