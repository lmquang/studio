import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, AlertCircle } from "lucide-react";
import { errorText } from "./api";

export function useResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(undefined);
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, revision]); // Each selection owns its response.
  return { data, error, loading, reload: () => setRevision((v) => v + 1) };
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="empty" role="status">
      Loading workspace…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Json({ value }: { value: unknown }) {
  return <pre className="json">{JSON.stringify(value, null, 2)}</pre>;
}
export function JsonInput({
  label,
  value,
  onChange,
  rows = 10,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        className="code"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </Field>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Form({
  children,
  submit,
  label = "Save changes",
  cancel,
  disabled = false,
}: {
  children: ReactNode;
  submit: () => Promise<void>;
  label?: string;
  cancel?: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submit();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <fieldset disabled={busy || disabled}>{children}</fieldset>
      <ErrorBox error={error} />
      <footer>
        {cancel && (
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        )}
        <button className="primary" disabled={busy || disabled}>
          {busy ? "Saving…" : label}
        </button>
      </footer>
    </form>
  );
}
export function Confirm({
  title,
  message,
  action,
  close,
}: {
  title: string;
  message: string;
  action: () => Promise<void>;
  close: () => void;
}) {
  return (
    <Modal title={title} close={close}>
      <Form
        submit={async () => {
          await action();
          close();
        }}
        label={title}
        cancel={close}
      >
        <p>{message}</p>
        <p className="warning">
          This action affects the live configuration. It cannot be undone here.
        </p>
      </Form>
    </Modal>
  );
}
export function Pager({
  page,
  pages,
  total,
  change,
}: {
  page: number;
  pages: number;
  total: number;
  change: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total} results · Page {page} of {Math.max(pages, 1)}
      </span>
      <button disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <button disabled={page >= pages} onClick={() => change(page + 1)}>
        Next
      </button>
    </div>
  );
}
export const pretty = (v: unknown) => JSON.stringify(v, null, 2);
export function objectJSON(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a JSON object.");
  return value as Record<string, unknown>;
}
export const date = (value: string) => new Date(value).toLocaleString();
