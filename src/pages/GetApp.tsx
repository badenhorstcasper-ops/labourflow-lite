import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Send, Sparkles, ShieldCheck, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InstallCta from "@/components/InstallCta";
import Seo from "@/components/Seo";
import { routeMessage } from "@/lib/cara/router";
import { renderMarkdownLite } from "@/lib/cara/renderMarkdownLite";
import { saveGuestDraft } from "@/lib/appLaunch";
import { trackStep } from "@/lib/funnel";
import { useSubscription } from "@/hooks/useSubscription";

const EXAMPLES = [
  "Can I dismiss someone for being rude to a customer?",
  "What must a valid sick note contain?",
  "How much notice pay must I give?",
];

/** The same six real situations as the home page, so the whole journey matches. */
const SITUATIONS: { label: string; q: string }[] = [
  {
    label: "Employee misconduct",
    q: "An employee committed misconduct at work. What are my options and next steps?",
  },
  {
    label: "Absent without leave",
    q: "My employee has been absent for three days without contacting us. What do I do?",
  },
  { label: "Disciplinary hearing", q: "How do I run a fair disciplinary hearing?" },
  { label: "CCMA notice", q: "I received a CCMA notice. What must I do and by when?" },
  { label: "Retrenchment", q: "I need to retrench staff. What is the correct process?" },
  {
    label: "Grievance",
    q: "An employee lodged a grievance against a manager. How do I handle it?",
  },
];


/**
 * Where people land from an advert. It keeps the advert's promise straight
 * away: ask a real South African labour question and get a real answer here,
 * before anyone is asked for an account, a plan or a card.
 */
const GetApp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading, isEntitled } = useSubscription();

  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && /^INR-[A-Z0-9]{4,12}$/i.test(ref)) {
      try {
        localStorage.setItem("inreco.ref", ref.toUpperCase());
      } catch (_) {}
    }
    void trackStep("/get", "landed");
    // Arriving from a "what do you need help with?" card: answer it immediately.
    const q = searchParams.get("q");
    if (q && q.trim() && !used) ask(q.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  const ref = searchParams.get("ref");
  const refQs = ref ? `&ref=${encodeURIComponent(ref)}` : "";
  const signupHref = `/auth?mode=signup&plan=solo${refQs}`;

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || used) return;
    setQuestion(clean);
    setInput("");
    saveGuestDraft(clean);
    void trackStep("/get", "asked_question");
    const decision = routeMessage(clean);
    if (decision.source === "knowledge" || decision.source === "template") {
      setAnswer(decision.text);
      void trackStep("/get", "saw_answer");
    } else {
      setAnswer(
        "That one needs CARA's full adviser, which switches on the moment your free account exists. Create it below and I'll answer this straight away — your question is saved.",
      );
    }
    setUsed(true);
  }

  function goSignUp() {
    if (input.trim()) saveGuestDraft(input.trim());
    void trackStep("/get", "tapped_signup");
    navigate(signupHref);
  }

  return (
    <>
      <Seo
        title="Ask a South African labour question free — iNRECO"
        description="Get an instant answer to your labour question from CARA, the iNRECO Pocket Labour Consultant. Free to try, no account and no card needed."
        path="/get"
      />
      <div className="min-h-screen bg-background text-foreground pb-16">
        <div className="mx-auto w-full max-w-xl px-4 pt-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="iNRECO Pocket Consultant app icon"
              width={48}
              height={48}
              className="rounded-xl shadow"
            />
            <div>
              <p className="text-sm font-bold leading-tight">iNRECO Pocket Labour Consultant</p>
              <p className="text-xs text-muted-foreground">South African labour law, on your phone</p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-bold leading-tight sm:text-3xl">
            Have a labour problem? Ask CARA.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell CARA what happened and she'll tell you what to do next. Free, right now — no
            account, no card, no waiting.
          </p>

          {!question && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What do you need help with?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SITUATIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => ask(s.q)}
                    className="min-h-[52px] rounded-xl border bg-card px-3 text-sm font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}


          <Card className="mt-5">
            <CardContent className="space-y-4 p-4">
              {!question && (
                <div className="space-y-2">
                  {EXAMPLES.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => ask(e)}
                      className="flex min-h-[56px] w-full items-center gap-2 rounded-xl border bg-background px-4 text-left text-sm"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                      {e}
                    </button>
                  ))}
                </div>
              )}

              {question && (
                <div className="space-y-3">
                  <p className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {question}
                  </p>
                  <div className="max-w-[95%] rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed">
                    {answer ? renderMarkdownLite(answer) : null}
                  </div>
                </div>
              )}

              {!used && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your labour question…"
                    aria-label="Your labour question"
                    className="h-[52px] flex-1 rounded-xl border bg-background px-4 text-base"
                  />
                  <Button type="submit" size="icon" className="h-[52px] w-[52px]" aria-label="Ask CARA">
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold">
              Keep asking — and get the letters that go with the answer
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Warnings, hearing packs, contracts and sick-note checks, all in your name.
              Seven days free. No card for the free week — R259 a month after that, cancel anytime.
            </p>
            <Button className="mt-3 w-full" onClick={goSignUp}>
              Start free — no card needed
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth?mode=login" className="underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Built on the BCEA, the LRA and the CCMA's own rules and time limits — not
                guesswork.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Ready-made warnings, hearing notices, contracts, dismissal letters and sick-note
                verification — filled in for you.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Made in South Africa by iNRECO, a working labour consultancy.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Your staff details stay in your private vault — encrypted, never sold, never
                shared with other businesses, and deleted whenever you ask.
              </p>
            </div>

          </div>

          <InstallCta variant="card" className="mt-6" label="Add iNRECO to my phone" />

          <div className="mt-6 text-center">
            {!loading && isEntitled ? (
              <Button variant="outline" onClick={() => navigate("/app")}>
                Open the app
              </Button>
            ) : (
              <Link to={`/pricing${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`} className="text-xs text-muted-foreground underline">
                See plans and prices
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GetApp;
