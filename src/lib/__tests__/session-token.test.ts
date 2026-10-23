import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "../session-token";

const key = new TextEncoder().encode(process.env.AUTH_SECRET!);

describe("session token", () => {
  it("round-trips an admin id and role", async () => {
    const token = await signSessionToken({ adminId: "abc", role: "OWNER" });
    expect(await verifySessionToken(token)).toEqual({ adminId: "abc", role: "OWNER" });
  });

  it("rejects missing, garbage and tampered tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
    const token = await signSessionToken({ adminId: "abc", role: "STAFF" });
    const [h, p, s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "abc", role: "OWNER", exp: 9999999999 })).toString("base64url");
    expect(await verifySessionToken(`${h}.${forgedPayload}.${s}`)).toBeNull();
    expect(p).toBeTruthy();
  });

  it("rejects tokens signed with a different secret", async () => {
    const other = new TextEncoder().encode("a-completely-different-secret-0123456789");
    const token = await new SignJWT({ role: "OWNER" }).setProtectedHeader({ alg: "HS256" }).setSubject("abc").setExpirationTime("1h").sign(other);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects expired tokens and unsigned (alg none) tokens", async () => {
    const expired = await new SignJWT({ role: "OWNER" }).setProtectedHeader({ alg: "HS256" }).setSubject("abc").setExpirationTime("-1h").sign(key);
    expect(await verifySessionToken(expired)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"abc","role":"OWNER"}').toString("base64url")}.`;
    expect(await verifySessionToken(none)).toBeNull();
  });

  it("rejects an unknown role claim", async () => {
    const token = await new SignJWT({ role: "ROOT" }).setProtectedHeader({ alg: "HS256" }).setSubject("abc").setExpirationTime("1h").sign(key);
    expect(await verifySessionToken(token)).toBeNull();
  });
});
