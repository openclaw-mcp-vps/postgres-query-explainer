import { ArrowRight, ChartSpline, Clock3, Database, ShieldCheck, Zap } from "lucide-react";
import { Suspense } from "react";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

const faqItems = [
  {
    title: "How do I unlock Pro after purchasing?",
    content:
      "Configure your Stripe Payment Link success URL to include the checkout session ID. After checkout, paste that session ID into the unlock field and the app sets a secure access cookie for 30 days."
  },
  {
    title: "What queries are supported?",
    content:
      "The explainer is optimized for SELECT, WITH, and VALUES statements. It runs EXPLAIN (FORMAT JSON) and converts PostgreSQL output into a graph with node-level diagnostics."
  },
  {
    title: "Does this execute my SQL query?",
    content:
      "No. The API runs EXPLAIN without ANALYZE, so PostgreSQL plans the query without executing it. That keeps read safety while still exposing planner behavior."
  },
  {
    title: "Who is this for?",
    content:
      "Backend developers and DBAs debugging slow endpoints, expensive reports, and planner regressions in staging or production-like environments."
  }
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0d1117] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.14),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:px-10">
        <header className="mb-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-sky-500/40 bg-sky-500/15">
              <ChartSpline className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">postgres-query-explainer</p>
              <p className="text-xs text-slate-500">Visual PostgreSQL query execution plans</p>
            </div>
          </div>
          <a href="#pricing" className="hidden text-sm font-medium text-slate-300 hover:text-white sm:block">
            Pricing
          </a>
        </header>

        <section className="mb-16 grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="accent" className="w-fit">
              Built for backend teams and DBAs
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Stop guessing why PostgreSQL queries are slow.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Paste SQL. Get an interactive plan graph that makes join order, scans, sort pressure, and row estimate
              mistakes obvious in seconds.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#tool"
                className="inline-flex h-11 items-center justify-center rounded-md bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Try the explainer
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href={stripePaymentLink}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 bg-[#101826] px-5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                Buy Pro - $19/mo
              </a>
            </div>
          </div>

          <Card className="border-slate-700/80 bg-[#101826]/90">
            <CardHeader>
              <CardTitle className="text-lg">Why teams buy this</CardTitle>
              <CardDescription>Engineers ship performance fixes faster when they can see the planner graph.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-sky-300" />
                <p>
                  Cut root-cause time for slow SQL by exposing scan strategy and join behavior without manually parsing
                  raw JSON plans.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-4 w-4 text-sky-300" />
                <p>Prioritize fixes by node cost concentration so optimization work targets the biggest wins first.</p>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-300" />
                <p>Secure paywalled access with cookie-based unlock after Stripe checkout confirmation.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mb-16 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">The problem</CardTitle>
              <CardDescription>
                Raw `EXPLAIN` output is structurally dense and slows down diagnosis during incidents.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">The solution</CardTitle>
              <CardDescription>
                Visual graph + node drill-down guidance that turns planner internals into clear next actions.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">The niche</CardTitle>
              <CardDescription>
                A focused database-tools workflow for teams who care about query latency and throughput.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section id="tool" className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Interactive SQL plan explainer</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Run PostgreSQL `EXPLAIN (FORMAT JSON)` through a clean UI designed for fast optimization work: tree
              visualization, node details, and query-level summary metrics.
            </p>
          </div>

          <Suspense
            fallback={
              <Card>
                <CardContent className="py-6 text-sm text-slate-300">Loading the plan workspace…</CardContent>
              </Card>
            }
          >
            <ToolWorkbench />
          </Suspense>
        </section>

        <section id="pricing" className="mb-16 grid gap-6 lg:grid-cols-[1fr,1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Simple pricing</CardTitle>
              <CardDescription>One plan for engineers who need query-plan clarity every week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-4xl font-bold text-white">
                  $19<span className="text-base font-medium text-slate-400">/month</span>
                </p>
                <p className="mt-2 text-sm text-slate-400">Unlimited plan visualizations, per user.</p>
              </div>

              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 text-sky-300" />
                  PostgreSQL plan graph with clickable node inspection
                </li>
                <li className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 text-sky-300" />
                  Cost and row-estimate diagnostics per node
                </li>
                <li className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 text-sky-300" />
                  Cookie-based gated access after checkout
                </li>
              </ul>

              <a href={stripePaymentLink} className="inline-flex">
                <Button size="lg">Buy with Stripe hosted checkout</Button>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">FAQ</CardTitle>
              <CardDescription>Everything teams ask before deploying this into their workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion items={faqItems} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
