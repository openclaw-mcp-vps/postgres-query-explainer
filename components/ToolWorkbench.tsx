"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QueryInput } from "@/components/QueryInput";
import { ExecutionPlanVisualizer } from "@/components/ExecutionPlanVisualizer";
import { PlanNodeDetails } from "@/components/PlanNodeDetails";
import type { ParsedPlan, PlanNode } from "@/lib/planParser";

type AuthState = {
  hasAccess: boolean;
  message?: string;
};

const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

export function ToolWorkbench() {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({ hasAccess: false });
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<ParsedPlan | null>(null);
  const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);

  const sessionIdFromUrl = useMemo(() => {
    const direct = searchParams.get("session_id");
    const fallback = searchParams.get("checkout_session_id");
    return direct ?? fallback;
  }, [searchParams]);

  const refreshAuthState = useCallback(async () => {
    const response = await fetch("/api/auth", {
      method: "GET",
      cache: "no-store"
    });

    const data = (await response.json()) as { hasAccess: boolean; message?: string };
    setAuthState({ hasAccess: Boolean(data.hasAccess), message: data.message });
  }, []);

  const redeemCheckoutSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId) {
        return;
      }

      setAuthLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId })
        });

        const payload = (await response.json()) as {
          unlocked?: boolean;
          hasAccess?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to verify checkout session.");
        }

        setAuthState({ hasAccess: Boolean(payload.unlocked || payload.hasAccess) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to unlock access.";
        setErrorMessage(message);
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void refreshAuthState();
  }, [refreshAuthState]);

  useEffect(() => {
    if (!sessionIdFromUrl || authState.hasAccess) {
      return;
    }

    setSessionIdInput(sessionIdFromUrl);
    void redeemCheckoutSession(sessionIdFromUrl);
  }, [sessionIdFromUrl, authState.hasAccess, redeemCheckoutSession]);

  const onExplain = useCallback(async (query: string) => {
    setExplainLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });

      const payload = (await response.json()) as {
        plan?: ParsedPlan;
        error?: string;
        requiresPayment?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate execution plan.");
      }

      if (!payload.plan) {
        throw new Error("Execution plan response is empty.");
      }

      setPlan(payload.plan);
      setSelectedNode(payload.plan.root);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setErrorMessage(message);
    } finally {
      setExplainLoading(false);
    }
  }, []);

  if (!authState.hasAccess) {
    return (
      <div id="tool" className="space-y-4">
        <Card className="border-sky-500/25 bg-[#101b2e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-sky-300" />
              Pro access required
            </CardTitle>
            <CardDescription>
              The visual execution plan explorer is available on the Pro plan. Purchase once and unlock instantly on
              this browser using your Stripe checkout session ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-[#0b1220] p-3 text-sm text-slate-300">
              <p className="flex items-center gap-2 font-semibold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Access model
              </p>
              <p className="mt-2 leading-relaxed">
                After Stripe confirms payment, we validate your checkout session and issue an HTTP-only access cookie
                valid for 30 days.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={stripePaymentLink}
                className="inline-flex h-10 items-center justify-center rounded-md bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
              >
                Buy Pro for $19/month
              </a>

              <Button variant="secondary" onClick={() => void refreshAuthState()}>
                I already unlocked
              </Button>
            </div>

            <div className="space-y-2">
              <label htmlFor="session-id" className="text-sm font-medium text-slate-200">
                Checkout session ID (from Stripe success redirect)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="session-id"
                  value={sessionIdInput}
                  onChange={(event) => setSessionIdInput(event.target.value)}
                  placeholder="cs_test_..."
                />
                <Button
                  onClick={() => void redeemCheckoutSession(sessionIdInput.trim())}
                  disabled={authLoading || sessionIdInput.trim().length === 0}
                >
                  {authLoading ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </div>

            {errorMessage ? (
              <p className="flex items-start gap-2 text-sm text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="tool" className="space-y-6">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Pro access active. You can run unlimited visual plan explanations.
        </p>
      </div>

      <QueryInput onExplain={onExplain} isLoading={explainLoading} />

      {errorMessage ? (
        <p className="flex items-start gap-2 text-sm text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </p>
      ) : null}

      {plan ? (
        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <ExecutionPlanVisualizer
            plan={plan}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => setSelectedNode(node)}
          />
          <PlanNodeDetails node={selectedNode} plan={plan} />
        </div>
      ) : null}
    </div>
  );
}
