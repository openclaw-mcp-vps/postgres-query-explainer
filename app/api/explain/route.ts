import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readAccessTokenFromRequest } from "@/lib/auth";
import { parseExplainPayload } from "@/lib/planParser";
import { runExplainQuery } from "@/lib/postgres";

const explainRequestSchema = z.object({
  query: z.string().min(15).max(12000)
});

function normalizeQuery(inputQuery: string): string {
  const trimmed = inputQuery.trim().replace(/;+\s*$/, "");

  if (trimmed.length === 0) {
    throw new Error("SQL query is empty.");
  }

  if (trimmed.includes(";")) {
    throw new Error("Only one SQL statement is allowed.");
  }

  if (/^\s*explain\b/i.test(trimmed)) {
    throw new Error("Paste raw SQL without EXPLAIN. The API wraps the query automatically.");
  }

  if (!/^(select|with|values)\b/i.test(trimmed)) {
    throw new Error("Only SELECT, WITH, and VALUES statements are supported.");
  }

  return trimmed;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = readAccessTokenFromRequest(request);
  if (!access) {
    return NextResponse.json(
      {
        error: "Pro access is required. Complete checkout and unlock this browser first.",
        requiresPayment: true
      },
      { status: 402 }
    );
  }

  try {
    const body = await request.json();
    const parsedBody = explainRequestSchema.parse(body);
    const normalizedQuery = normalizeQuery(parsedBody.query);

    const rawPlan = await runExplainQuery(normalizedQuery);
    const parsedPlan = parseExplainPayload(rawPlan);

    return NextResponse.json({ plan: parsedPlan });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected error while generating the execution plan.";

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
