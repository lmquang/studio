import { afterEach, describe, expect, it, vi } from "vitest";
import { api, APIError, errorText, request } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("API transport", () => {
  it("sends credentials and JSON using the same origin", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "flag" } })),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await api("/flags", "POST", { name: "test" })).toEqual({
      id: "flag",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/flags",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        body: '{"name":"test"}',
      }),
    );
  });
  it("keeps pagination metadata", async () => {
    const page = { data: [], total: 52, totalPages: 3 };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(page))),
    );
    expect(await request("/flags")).toEqual(page);
  });
  it("supports a 204 delete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect(await api("/flags/id", "DELETE")).toBeUndefined();
  });
  it("surfaces field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              message: "validation failed",
              errors: { "payload.defaultRule": ["invalid variation"] },
            }),
            { status: 400 },
          ),
        ),
    );
    try {
      await api("/flags");
      throw Error("expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(APIError);
      expect(errorText(e)).toContain("payload.defaultRule: invalid variation");
    }
  });
  it("signals an expired session on 401", async () => {
    const handler = vi.fn();
    window.addEventListener("session-expired", handler);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(api("/auth/me")).rejects.toBeInstanceOf(APIError);
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("session-expired", handler);
  });
});
