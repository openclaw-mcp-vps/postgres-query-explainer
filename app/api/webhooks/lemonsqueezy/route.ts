import { NextRequest, NextResponse } from "next/server";
import {
  configureLemonSqueezyClient,
  extractPaidSessionFromEvent,
  parseStripeWebhookEvent,
  verifyStripeWebhookSignature
} from "@/lib/lemonsqueezy";
import { recordPaidCheckoutSession } from "@/lib/postgres";

export async function POST(request: NextRequest): Promise<NextResponse> {
  configureLemonSqueezyClient();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is missing. Cannot verify webhook signatures." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  const isValid = verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const event = parseStripeWebhookEvent(rawBody);
    const paidSession = extractPaidSessionFromEvent(event);

    if (paidSession) {
      await recordPaidCheckoutSession({
        sessionId: paidSession.sessionId,
        customerEmail: paidSession.customerEmail,
        eventType: event.type,
        rawPayload: event
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed."
      },
      { status: 400 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ready",
    webhook: "stripe",
    route: "/api/webhooks/lemonsqueezy"
  });
}
