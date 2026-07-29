import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import BackHomeBar from "@/components/BackHomeBar";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "Who must register for UIF in South Africa?",
    a: "Almost every employer must register. If you employ anyone for more than 24 hours a month, you must register the business and each worker with the Unemployment Insurance Fund and pay monthly contributions.",
  },
  {
    q: "How much UIF must I pay each month?",
    a: "You deduct 1% of the worker's monthly earnings and add 1% from the business, so 2% in total, up to the monthly earnings ceiling set by the Department of Employment and Labour.",
  },
  {
    q: "What is uFiling?",
    a: "uFiling is the Department of Employment and Labour's free online service where employers declare workers, submit monthly returns and pay UIF contributions without visiting a labour centre.",
  },
  {
    q: "When are UIF declarations and payments due?",
    a: "Declarations and payments are due by the 7th of the month following the month in which the wages were paid. Late payments attract penalties and interest.",
  },
  {
    q: "What must I do when a worker leaves?",
    a: "Update the worker's status on uFiling with the correct reason for leaving and the last day worked, and give the worker a completed UI-19. Without this the worker cannot claim.",
  },
];

const steps = [
  {
    title: "1. Get your details together",
    body: "You need the business registration or ID number, the trading name, banking details, contact details, and each worker's ID number, start date and monthly pay.",
  },
  {
    title: "2. Register the business for UIF",
    body: "Register the business with the Unemployment Insurance Fund (form UI-8 for companies or UI-8D for domestic employers). You receive a UIF reference number that you use for everything after this.",
  },
  {
    title: "3. Create your uFiling account",
    body: "Go to the official uFiling website, choose to register as an employer, and activate the account using your UIF reference number. Keep the username and password somewhere safe — you will use it every month.",
  },
  {
    title: "4. Load your workers",
    body: "Add every worker with their ID number, start date and monthly earnings. Check the spelling of names against IDs; wrong details are the most common reason a claim is rejected later.",
  },
  {
    title: "5. Declare and pay each month",
    body: "Each month, confirm the earnings for every worker, submit the declaration and pay the 2% before the 7th. uFiling can debit the business account automatically.",
  },
  {
    title: "6. Keep it up to date",
    body: "Record every new hire, resignation, dismissal, maternity leave and pay change as it happens. That way a worker who needs to claim can do so without a fight, and your records survive an inspection.",
  },
];

export default function UifGuide() {
  return (
    <>
      <Seo
        title="UIF registration and uFiling: employer guide (South Africa)"
        description="A plain-language guide for South African employers: how to register for UIF, set up uFiling, declare workers and pay the monthly 2% contribution on time."
        path="/guides/uif-ufiling"
      >
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Seo>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 py-10">
          <BackHomeBar homeTo="/" />

          <article className="prose prose-slate mt-6 max-w-none dark:prose-invert">
            <h1 className="text-3xl font-bold tracking-tight">
              UIF registration and uFiling: a step-by-step guide for South African employers
            </h1>
            <p className="mt-4 text-muted-foreground">
              Every South African employer has to register workers for the Unemployment
              Insurance Fund (UIF) and declare them each month. Most of that work now happens
              on uFiling, the Department of Employment and Labour's free online service. Here
              is the whole process in plain language.
            </p>

            <h2 className="mt-10 text-2xl font-semibold">What UIF is and why it matters</h2>
            <p>
              UIF pays a temporary income to workers who lose their job, or who cannot work
              because of illness, maternity or adoption leave. It is funded by a 2% monthly
              contribution: 1% deducted from the worker's pay and 1% paid by the business.
              Registering is not optional, and inspectors check it. Unregistered employers face
              penalties, and workers who cannot claim usually take the matter further.
            </p>

            <h2 className="mt-10 text-2xl font-semibold">Step by step</h2>
            {steps.map((s) => (
              <div key={s.title} className="mt-6">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.body}</p>
              </div>
            ))}

            <h2 className="mt-10 text-2xl font-semibold">Mistakes that cost employers money</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Paying late — anything after the 7th attracts penalties and interest.</li>
              <li>Leaving casual or part-time workers off the declaration when they work more than 24 hours a month.</li>
              <li>Not updating a worker's status when they leave, which blocks their claim.</li>
              <li>Using earnings figures that do not match your payroll records.</li>
              <li>Forgetting domestic workers, who must also be registered.</li>
            </ul>

            <h2 className="mt-10 text-2xl font-semibold">Common questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="mt-6">
                <h3 className="text-lg font-semibold">{f.q}</h3>
                <p className="mt-1 text-muted-foreground">{f.a}</p>
              </div>
            ))}

            <h2 className="mt-10 text-2xl font-semibold">Where iNRECO helps</h2>
            <p className="text-muted-foreground">
              UIF admin usually raises bigger questions: what to pay someone on sick leave, how
              to end employment properly, what to put in writing. CARA, the assistant inside
              iNRECO, answers those questions in everyday language and generates the letters,
              warnings and contracts you need — so the paperwork behind each uFiling update is
              correct too.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/pricing">Start your 7-day free trial</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Ask us a question</Link>
              </Button>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              This guide is general information about South African labour administration, not
              legal advice. Always check the current thresholds and forms on the Department of
              Employment and Labour website.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
