import { describe, expect, it } from "vitest";
import {
  canEdit,
  initialPayload,
  payloadChanges,
  validatePayload,
} from "./payload";
import { objectJSON } from "./ui";

describe("flag payloads", () => {
  it.each(["boolean", "string", "number", "json"])(
    "creates valid %s defaults",
    (type) => {
      expect(validatePayload(initialPayload(type))).toEqual([]);
    },
  );
  it("rejects percentages that do not sum to 100", () => {
    const p = initialPayload("boolean");
    p.defaultRule = { percentage: { on: 75, off: 15 } };
    expect(validatePayload(p)).toContain(
      "Default rule: percentages must total 100.",
    );
  });
  it("rejects references to deleted variations", () => {
    const p = initialPayload("boolean");
    p.defaultRule = { variation: "missing" };
    expect(validatePayload(p)).toContain(
      "Default rule: variation does not exist.",
    );
  });
  it("rejects empty targeting queries even when disabled", () => {
    const p = initialPayload("boolean");
    p.targeting = [{ disable: true, query: "", variation: "on" }];
    expect(validatePayload(p)).toContain("Rule 1: query is required.");
  });
  it("keeps enabled state outside the payload", () => {
    const p = { ...initialPayload("boolean"), disable: true };
    expect(validatePayload(p)).toContain(
      "Use the flag status toggle, not payload.disable.",
    );
  });
  it("reports changed top-level sections without dropping custom fields", () => {
    const p = { ...initialPayload("boolean"), metadata: { custom: { a: 1 } } };
    const next = { ...p, defaultRule: { variation: "on" } };
    expect(payloadChanges(p, next)).toEqual(["defaultRule"]);
    expect(next.metadata).toEqual(p.metadata);
  });
  it.each(["null", "[]", "1", '"hello"'])(
    "rejects non-object JSON: %s",
    (text) => {
      expect(() => objectJSON(text)).toThrow("Expected a JSON object.");
    },
  );
  it.each(["viewer", "member", undefined])(
    "does not grant write access to %s",
    (role) => expect(canEdit(role)).toBe(false),
  );
  it.each(["admin", "editor"])("grants write access to %s", (role) =>
    expect(canEdit(role)).toBe(true),
  );
});
