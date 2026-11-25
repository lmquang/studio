import type { Payload, Rule } from "./types";
export function initialPayload(type: string): Payload {
  const values: Record<string, unknown[]> = {
    boolean: [true, false],
    string: ["enabled", "disabled"],
    number: [1, 0],
    json: [{ enabled: true }, { enabled: false }],
  };
  const [on, off] = values[type] ?? values.boolean;
  return {
    variations: { on, off },
    defaultRule: { variation: "off" },
    targeting: [],
  };
}
export function validatePayload(p: Payload): string[] {
  const errors: string[] = [];
  if (!p || typeof p !== "object" || Array.isArray(p))
    return ["Payload must be an object."];
  if (
    !p.variations ||
    typeof p.variations !== "object" ||
    Array.isArray(p.variations) ||
    Object.keys(p.variations).length < 2
  )
    errors.push("At least two variations are required.");
  if ("disable" in p)
    errors.push("Use the flag status toggle, not payload.disable.");
  const check = (rule: Rule | undefined, name: string) => {
    if (!rule || typeof rule !== "object") {
      errors.push(`${name} is required.`);
      return;
    }
    if (rule.percentage) {
      const values = Object.values(rule.percentage);
      if (
        values.some(
          (v) =>
            typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100,
        ) ||
        Math.abs(values.reduce((a, b) => a + b, 0) - 100) > 0.001
      )
        errors.push(`${name}: percentages must total 100.`);
      if (
        Object.keys(rule.percentage).some(
          (key) => !(key in (p.variations ?? {})),
        )
      )
        errors.push(`${name}: percentage references a missing variation.`);
    }
    if (rule.variation && !(rule.variation in (p.variations ?? {})))
      errors.push(`${name}: variation does not exist.`);
  };
  check(p.defaultRule, "Default rule");
  if (p.targeting && !Array.isArray(p.targeting))
    errors.push("Targeting must be an array.");
  else
    p.targeting?.forEach((r, i) => {
      check(r, `Rule ${i + 1}`);
      if (!r.query?.trim()) errors.push(`Rule ${i + 1}: query is required.`);
    });
  return errors;
}
export function canEdit(role?: string) {
  return role === "admin" || role === "editor";
}
export function payloadChanges(before: Payload, after: Payload) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}
