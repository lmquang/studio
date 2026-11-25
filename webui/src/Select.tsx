import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

type Props = Omit<
  ComponentProps<"select">,
  "onChange" | "value" | "defaultValue" | "multiple" | "size"
> & {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
};
const emptyValue = "__studio_empty_option__";

// Retain option-shaped call sites while sharing one accessible popup implementation.
export function Select({
  children,
  value,
  onChange,
  disabled,
  required,
  name,
  className,
  id,
  "aria-label": ariaLabel,
  ...rest
}: Props) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const options = Children.toArray(children)
    .filter(
      isValidElement<{
        value?: string;
        disabled?: boolean;
        children?: ReactNode;
      }>,
    )
    .map((child) => ({
      value: String(child.props.value ?? child.props.children ?? ""),
      label: child.props.children,
      disabled: child.props.disabled,
    }));
  // Native dialogs occupy the top layer. Portaling into body would put the menu behind them.
  const container = trigger?.closest("dialog") ?? undefined;
  return (
    <Primitive.Root
      value={value === "" ? emptyValue : value}
      onValueChange={(next) =>
        onChange({ target: { value: next === emptyValue ? "" : next } })
      }
      disabled={disabled}
      required={required}
      name={name}
    >
      <Primitive.Trigger
        ref={setTrigger}
        id={id}
        className={`select-trigger ${className ?? ""}`}
        aria-label={ariaLabel}
        aria-describedby={rest["aria-describedby"]}
      >
        <Primitive.Value />
        <Primitive.Icon className="select-chevron">
          <ChevronDown size={16} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal container={container}>
        <Primitive.Content
          className="select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Primitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={16} />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className="select-viewport">
            {options.map((option) => (
              <Primitive.Item
                className="select-option"
                key={option.value}
                value={option.value === "" ? emptyValue : option.value}
                disabled={option.disabled}
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className="select-check">
                  <Check size={15} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={16} />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
