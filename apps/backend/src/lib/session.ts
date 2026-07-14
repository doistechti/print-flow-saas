import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { SessionTokenPayload } from "@print-flow/contracts";

const encoder = new TextEncoder();

function base64UrlEncode(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function createSignature(payload: string) {
  return base64UrlEncode(
    crypto.createHmac("sha256", env.SESSION_SECRET).update(encoder.encode(payload)).digest(),
  );
}

export function createSessionToken(payload: SessionTokenPayload) {
  const serializedPayload = JSON.stringify(payload);
  const signature = createSignature(serializedPayload);
  return `${base64UrlEncode(serializedPayload)}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [rawPayload, signature] = token.split(".");

  if (!rawPayload || !signature) {
    return null;
  }

  try {
    const payloadText = base64UrlDecode(rawPayload);
    const expectedSignature = createSignature(payloadText);

    if (signature.length !== expectedSignature.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(payloadText) as SessionTokenPayload;

    if (Date.parse(payload.expiresAt) <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
