import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Select } from "./Select";

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(cleanup);
function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <Select
      aria-label="Team"
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
    >
      <option value="">All teams</option>
      <option value="payments">Payments</option>
      <option value="billing" disabled>
        Billing
      </option>
    </Select>
  );
}
describe("shared select", () => {
  it("opens a styled list and selects an option", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("combobox", { name: "Team" }));
    expect(screen.getByRole("listbox").className).toContain("select-content");
    await user.click(screen.getByRole("option", { name: "Payments" }));
    expect(screen.getByRole("combobox").textContent).toContain("Payments");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("supports keyboard navigation, skips disabled options and restores focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("combobox").focus();
    await user.keyboard("{ArrowDown}{End}{Enter}");
    expect(screen.getByRole("combobox").textContent).toContain("Payments");
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });
  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<Example disabled />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
