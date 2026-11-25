import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(async (path: string) => {
    if (path === "/auth/me") {
      return { user: { id: "user", email: "user@example.com", name: "User", isSuperAdmin: false }, membership: [] };
    }
    if (path === "/config") return { monoCompany: true };
    return [];
  }),
}));

afterEach(cleanup);

it("links API reference to the current origin instead of a development hostname", async () => {
  render(<App />);
  const link = await screen.findByRole("link", { name: "API reference" });
  expect(link.getAttribute("href")).toBe("/swagger/index.html");
  expect(new URL((link as HTMLAnchorElement).href).origin).toBe(window.location.origin);
});
