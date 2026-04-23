import { createHmac, timingSafeEqual } from "node:crypto";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object?: Record<string, unknown>;
  };
};

let lemonSqueezyConfigured = false;

export function configureLemonSqueezyClient(): void {
  if (lemonSqueezyConfigured) {
    return;
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (apiKey) {
    lemonSqueezySetup({ apiKey });
    lemonSqueezyConfigured = true;
  }
}

function parseSignatureHeader(signatureHeader: string): { timestamp: string; signatures: string[] } | null {
  const chunks = signatureHeader.split(",").map((chunk) => chunk.trim());
  let timestamp = "";
  const signatures: string[] = [];

  for (const chunk of chunks) {
    const [key, value] = chunk.split("=");
    if (!key || !value) {
      continue;
    }

    if (key === "t") {
      timestamp = value;
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuffer = Buffer.from(expected);

  return parsed.signatures.some((signature) => {
    const receivedBuffer = Buffer.from(signature);
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  });
}

export function parseStripeWebhookEvent(payload: string): StripeWebhookEvent {
  const parsed = JSON.parse(payload) as Partial<StripeWebhookEvent>;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Webhook payload is invalid.");
  }

  if (typeof parsed.id !== "string" || typeof parsed.type !== "string") {
    throw new Error("Webhook payload is missing id or type.");
  }

  return {
    id: parsed.id,
    type: parsed.type,
    data: typeof parsed.data === "object" && parsed.data ? parsed.data : {}
  };
}

export function extractPaidSessionFromEvent(event: StripeWebhookEvent): {
  sessionId: string;
  customerEmail: string | null;
} | null {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return null;
  }

  const dataObject = event.data.object;
  if (!dataObject) {
    return null;
  }

  const sessionId = typeof dataObject.id === "string" ? dataObject.id : null;
  const paymentStatus = typeof dataObject.payment_status === "string" ? dataObject.payment_status : null;
  const sessionStatus = typeof dataObject.status === "string" ? dataObject.status : null;

  if (!sessionId) {
    return null;
  }

  const paid = paymentStatus === "paid" || sessionStatus === "complete";
  if (!paid) {
    return null;
  }

  const customerEmail =
    typeof dataObject.customer_email === "string"
      ? dataObject.customer_email
      : typeof dataObject["customer_details"] === "object" && dataObject["customer_details"]
        ? ((dataObject["customer_details"] as Record<string, unknown>).email as string | undefined) ?? null
        : null;

  return {
    sessionId,
    customerEmail
  };
}
