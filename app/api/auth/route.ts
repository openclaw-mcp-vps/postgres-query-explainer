import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearAccessCookie,
  createAccessToken,
  readAccessTokenFromRequest,
  setAccessCookie
} from "@/lib/auth";
import { isPaidCheckoutSession } from "@/lib/postgres";

const unlockSchema = z.object({
  sessionId: z.string().min(8).max(255)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = readAccessTokenFromRequest(request);

  if (!access) {
    return NextResponse.json({ hasAccess: false });
  }

  return NextResponse.json({ hasAccess: true, sessionId: access.sid, email: access.email ?? null });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sessionId } = unlockSchema.parse(body);

    const paid = await isPaidCheckoutSession(sessionId);
    if (!paid) {
      return NextResponse.json(
        {
          error:
            "This checkout session is not unlocked yet. Wait for Stripe webhook delivery, then try again."
        },
        { status: 403 }
      );
    }

    const token = createAccessToken({ sessionId });
    const response = NextResponse.json({ unlocked: true, hasAccess: true });
    setAccessCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to process unlock request."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ hasAccess: false });
  clearAccessCookie(response);
  return response;
}
