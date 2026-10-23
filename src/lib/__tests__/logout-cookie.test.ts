import { afterEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set, delete: vi.fn() }), headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { destroySession } from "../auth";
import { SESSION_COOKIE } from "../session-token";

afterEach(() => { set.mockClear(); vi.unstubAllEnvs(); });

describe("destroySession", () => {
  it("expires the cookie with the same Secure/Path/HttpOnly attributes it was created with (needed for __Host- cookies)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await destroySession();
    expect(set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE);
    expect(value).toBe("");
    expect(opts).toMatchObject({ secure: true, path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
    expect(opts.expires.getTime()).toBe(0);
  });
});
