// Edge-safe session token helpers (used by proxy.ts and server code). No database access here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
// "__Host-" prefix (production) forces Secure + Path=/ + no Domain, which blocks cookie tossing.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters (see .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  adminId: string;
  role: "OWNER" | "STAFF";
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "OWNER" && payload.role !== "STAFF")) return null;
    return { adminId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
