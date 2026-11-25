import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PayloadEditor } from "./FlagEditor";
import { initialPayload } from "./payload";
import { Form } from "./ui";
afterEach(cleanup);
function Editor() {
  const [value, change] = useState(initialPayload("boolean"));
  return (
    <Form submit={async () => {}}>
      <PayloadEditor value={value} change={change} />
      <output data-testid="payload">{JSON.stringify(value)}</output>
    </Form>
  );
}
describe("visual flag editor", () => {
  it("preserves configuration when switching between JSON and visual editors", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(screen.getByText("Advanced JSON"));
    const payload = {
      ...initialPayload("boolean"),
      metadata: { custom: { keep: true }, tags: ["release"] },
      bucketingKey: "accountId",
    };
    await user.clear(screen.getByLabelText("Flag payload"));
    await user.type(
      screen.getByLabelText("Flag payload"),
      JSON.stringify(payload).replaceAll("{", "{{").replaceAll("[", "[["),
    );
    await user.click(screen.getByText("Visual editor"));
    expect(JSON.parse(screen.getByTestId("payload").textContent!)).toEqual(
      payload,
    );
  });
  it("adds targeting rules without discarding default outcomes", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(screen.getByText("Add targeting rule"));
    const value = JSON.parse(screen.getByTestId("payload").textContent!);
    expect(value.defaultRule).toEqual({ variation: "off" });
    expect(value.targeting).toHaveLength(1);
    expect(screen.getByLabelText("Query", { exact: false })).toBeTruthy();
  });
  it("shows invalid advanced JSON without crashing", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(screen.getByText("Advanced JSON"));
    await user.clear(screen.getByLabelText("Flag payload"));
    await user.type(screen.getByLabelText("Flag payload"), "null");
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
    expect(
      JSON.parse(screen.getByTestId("payload").textContent!).variations,
    ).toEqual({ on: true, off: false });
  });
});
