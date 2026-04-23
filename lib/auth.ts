import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "pqe_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

type AccessTokenPayload = {
  sid: string;
  email?: string;
  iat: number;
  exp: number;
};

function getSigningSecret(): string {
  return (
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-secret-change-in-production"
  );
}

function sign(message: string): string {
  return createHmac("sha256", getSigningSecret()).update(message).digest("base64url");
}

function encodePayload(payload: AccessTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encodedPayload: string): AccessTokenPayload | null {
  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<AccessTokenPayload>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.sid !== "string") {
      return null;
    }

    if (typeof parsed.iat !== "number" || typeof parsed.exp !== "number") {
      return null;
    }

    return {
      sid: parsed.sid,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      iat: parsed.iat,
      exp: parsed.exp
    };
  } catch {
    return null;
  }
}

export function createAccessToken(input: { sessionId: string; email?: string | null }): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sid: input.sessionId,
    email: input.email ?? undefined,
    iat,
    exp: iat + ACCESS_TTL_SECONDS
  };

  const encodedPayload = encodePayload(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string | undefined): AccessTokenPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, receivedSignature] = parts;
  const expectedSignature = sign(encodedPayload);

  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return null;
  }

  return payload;
}

export function readAccessTokenFromRequest(request: NextRequest): AccessTokenPayload | null {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  return verifyAccessToken(token);
}

export function setAccessCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS
  });
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}
