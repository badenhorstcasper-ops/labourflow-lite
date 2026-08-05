import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import InstallCta from "@/components/InstallCta";
import Seo from "@/components/Seo";
import { routeMessage } from "@/lib/cara/router";
import { TOPICS } from "@/lib/cara/knowledge";
import { saveGuestDraft } from "@/lib/appLaunch";

const EXAMPLES = [
  "An employee was rude to a customer. Can I issue a final written warning?",
  "How much notice must I give for a disciplinary hearing?",
  "What must a valid sick note contain?",
];

/**
 * What a visitor sees before they have an account: they can ask one question
 * and get a real answer from CARA's built-in guidance, install the app, and
 * then create their free account when they want to carry on.
 */
export default function GuestPreview() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || used) return;
    setQuestion(clean);
    setInput("");
    saveGuestDraft(clean);
    const decision = routeMessage(clean);
    if (decision.source === "knowledge" || decision.source === "template") {
      setAnswer(decision.text);
    } else {
      setAnswer(
        "That one needs CARA's full adviser, which switches on the moment your free account exists. Create it below and I'll answer this straight away.",
      );
    }
    setUsed(true);
  }

  function goSignUp() {
    if (input.trim()) saveGuestDraft(input.trim());
    navigate("/auth?mode=signup");
  }

  return (
    <>
      <Seo
        title="Try CARA free — iNRECO Pocket Labour Consultant"
        description="Ask CARA a South African labour question and see the answer before you create an account. Install the iNRECO app free, no card needed."
        path="/app"
      />
      <div className="min-h-screen bg-background pb-16">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-xl font-bold leading-tight">Ask CARA</h1>
              <p className="text-xs text-muted-foreground">
                Try one question now — no account needed.
              </p>
            </div>
          </div>

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
                  <div className="max-w-[95%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-3 text-sm">
                    {answer}
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
                    className="h-[52px] flex-1 rounded-xl border bg-background px-4 text-base"
                  />
                  <Button type="submit" size="icon" className="h-[52px] w-[52px]">
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold">Carry on with your free week</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your account to keep asking, generate warnings and hearing packs, and
              save your documents. Seven days free, no card needed.
            </p>
            <Button className="mt-3 w-full" onClick={goSignUp}>
              Create my free account
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Already have one?{" "}
              <Link to="/auth?mode=login" className="underline">
                Sign in
              </Link>
            </p>
          </div>

          <InstallCta variant="card" className="mt-5" />

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What CARA covers
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.slice(0, 12).map((t) => (
                <span key={t.key} className="rounded-full border bg-card px-3 py-1.5 text-xs">
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
