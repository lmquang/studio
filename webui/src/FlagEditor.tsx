import { Select } from "./Select";
import { useEffect, useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { api, request } from "./api";
import {
  Empty,
  ErrorBox,
  Field,
  Form,
  Json,
  JsonInput,
  Loading,
  Modal,
  date,
  objectJSON,
  pretty,
  useResource,
} from "./ui";
import { payloadChanges, validatePayload } from "./payload";
import type { Flag, Flagset, Page, Payload, Rule, Version } from "./types";

function Outcome({
  rule,
  names,
  change,
}: {
  rule: Rule;
  names: string[];
  change: (r: Rule) => void;
}) {
  const mode = rule.progressiveRollout
    ? "progressive"
    : rule.percentage
      ? "percentage"
      : "variation";
  function switchMode(next: string) {
    const r = { ...rule };
    delete r.variation;
    delete r.percentage;
    delete r.progressiveRollout;
    if (next === "variation") r.variation = names[0];
    if (next === "percentage")
      r.percentage = Object.fromEntries(
        names.map((n, i) => [n, i === 0 ? 100 : 0]),
      );
    if (next === "progressive")
      r.progressiveRollout = {
        initial: {
          variation: names[0],
          percentage: 0,
          date: new Date().toISOString(),
        },
        end: {
          variation: names[1],
          percentage: 100,
          date: new Date(Date.now() + 86400000).toISOString(),
        },
      };
    change(r);
  }
  return (
    <div className="outcome">
      <Field label="Serve">
        <Select value={mode} onChange={(e) => switchMode(e.target.value)}>
          <option value="variation">Single variation</option>
          <option value="percentage">Percentage split</option>
          <option value="progressive">Progressive rollout</option>
        </Select>
      </Field>
      {mode === "variation" && (
        <Field label="Variation">
          <Select
            value={rule.variation ?? ""}
            onChange={(e) => change({ ...rule, variation: e.target.value })}
          >
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </Field>
      )}
      {mode === "percentage" &&
        names.map((n) => (
          <Field label={`${n} %`} key={n}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rule.percentage?.[n] ?? 0}
              onChange={(e) =>
                change({
                  ...rule,
                  percentage: {
                    ...rule.percentage,
                    [n]: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
        ))}
      {mode === "progressive" &&
        (["initial", "end"] as const).map((step) => (
          <div className="panel" key={step}>
            <h4>{step === "initial" ? "Start" : "Finish"}</h4>
            <Field label="Date (ISO 8601)">
              <input
                required
                value={rule.progressiveRollout![step].date}
                onChange={(e) =>
                  change({
                    ...rule,
                    progressiveRollout: {
                      ...rule.progressiveRollout!,
                      [step]: {
                        ...rule.progressiveRollout![step],
                        date: e.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
            <Field label="Variation">
              <Select
                value={rule.progressiveRollout![step].variation}
                onChange={(e) =>
                  change({
                    ...rule,
                    progressiveRollout: {
                      ...rule.progressiveRollout!,
                      [step]: {
                        ...rule.progressiveRollout![step],
                        variation: e.target.value,
                      },
                    },
                  })
                }
              >
                {names.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </Field>
            <Field label="Percentage">
              <input
                type="number"
                min="0"
                max="100"
                value={rule.progressiveRollout![step].percentage}
                onChange={(e) =>
                  change({
                    ...rule,
                    progressiveRollout: {
                      ...rule.progressiveRollout!,
                      [step]: {
                        ...rule.progressiveRollout![step],
                        percentage: Number(e.target.value),
                      },
                    },
                  })
                }
              />
            </Field>
          </div>
        ))}
    </div>
  );
}
export function PayloadEditor({
  value,
  change,
  invalid,
}: {
  value: Payload;
  change: (p: Payload) => void;
  invalid?: (v: boolean) => void;
}) {
  const [mode, setMode] = useState("visual");
  const [raw, setRaw] = useState(pretty(value));
  const [error, setError] = useState("");
  useEffect(() => {
    setRaw(pretty(value));
  }, [value]);
  useEffect(() => {
    invalid?.(!!error);
  }, [error, invalid]);
  const names = Object.keys(value.variations ?? {});
  function visual() {
    try {
      const p = objectJSON(raw) as unknown as Payload;
      if (
        !p.variations ||
        !p.defaultRule ||
        (p.targeting && !Array.isArray(p.targeting))
      )
        throw new Error(
          "Provide variations, defaultRule and an optional targeting array.",
        );
      change(p);
      setError("");
      setMode("visual");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function updateRule(i: number, r: Rule) {
    change({
      ...value,
      targeting: value.targeting?.map((v, n) => (n === i ? r : v)),
    });
  }
  return (
    <>
      <div className="tabs">
        <button
          type="button"
          className={mode === "visual" ? "active" : ""}
          onClick={visual}
        >
          Visual editor
        </button>
        <button
          type="button"
          className={mode === "json" ? "active" : ""}
          onClick={() => {
            setRaw(pretty(value));
            setMode("json");
          }}
        >
          Advanced JSON
        </button>
      </div>
      {mode === "json" ? (
        <>
          <p className="muted">
            Full GOFF configuration: scheduled rollouts, experimentation
            windows, bucketing, metadata and custom query formats. Changes are
            validated by the server.
          </p>
          <JsonInput
            label="Flag payload"
            value={raw}
            rows={24}
            onChange={(text) => {
              setRaw(text);
              try {
                const parsed = objectJSON(text) as unknown as Payload;
                if (
                  !parsed.variations ||
                  typeof parsed.variations !== "object" ||
                  Array.isArray(parsed.variations) ||
                  !parsed.defaultRule ||
                  (parsed.targeting && !Array.isArray(parsed.targeting))
                )
                  throw new Error("Invalid structure");
                change(parsed);
                setError("");
              } catch {
                setError("Invalid JSON. Fix the payload before saving.");
              }
            }}
          />
        </>
      ) : (
        <>
          <section>
            <h3>Variations</h3>
            <p className="muted">
              Values must share a type. Variation names are referenced by rules.
            </p>
            {names.map((name) => (
              <div className="variation" key={name}>
                <code>{name}</code>
                <VariationValue
                  value={value.variations[name]}
                  change={(v) =>
                    change({
                      ...value,
                      variations: { ...value.variations, [name]: v },
                    })
                  }
                />
                <button
                  type="button"
                  aria-label={`Remove variation ${name}`}
                  onClick={() => {
                    const variations = { ...value.variations };
                    delete variations[name];
                    change({ ...value, variations });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                let name = "variation";
                let i = 1;
                while (name in value.variations) name = `variation-${i++}`;
                change({
                  ...value,
                  variations: {
                    ...value.variations,
                    [name]: Object.values(value.variations)[0] ?? false,
                  },
                });
              }}
            >
              <Plus size={16} /> Add variation
            </button>
            <p className="hint">
              Use advanced JSON to rename variation keys and update their
              references together.
            </p>
          </section>
          <section>
            <div className="section-heading">
              <h3>Targeting rules</h3>
              <span className="muted">Evaluated top to bottom</span>
            </div>
            {(value.targeting ?? []).map((r, i) => (
              <div className="rule" key={i}>
                <div className="section-heading">
                  <strong>Rule {i + 1}</strong>
                  <div className="actions">
                    <button
                      type="button"
                      aria-label={`Move rule ${i + 1} up`}
                      disabled={!i}
                      onClick={() => {
                        const rules = [...value.targeting!];
                        [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
                        change({ ...value, targeting: rules });
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move rule ${i + 1} down`}
                      disabled={i === value.targeting!.length - 1}
                      onClick={() => {
                        const rules = [...value.targeting!];
                        [rules[i + 1], rules[i]] = [rules[i], rules[i + 1]];
                        change({ ...value, targeting: rules });
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove rule ${i + 1}`}
                      onClick={() =>
                        change({
                          ...value,
                          targeting: value.targeting?.filter((_, n) => n !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Field label="Rule name">
                  <input
                    value={r.name ?? ""}
                    onChange={(e) =>
                      updateRule(i, { ...r, name: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Query"
                  hint={'Example: email eq "admin@local.io" or country eq "FR"'}
                >
                  <textarea
                    className="code"
                    required
                    value={r.query ?? ""}
                    onChange={(e) =>
                      updateRule(i, { ...r, query: e.target.value })
                    }
                  />
                </Field>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!r.disable}
                    onChange={(e) =>
                      updateRule(i, { ...r, disable: e.target.checked })
                    }
                  />{" "}
                  Pause this rule
                </label>
                <Outcome
                  rule={r}
                  names={names}
                  change={(next) => updateRule(i, next)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                change({
                  ...value,
                  targeting: [
                    ...(value.targeting ?? []),
                    {
                      name: `rule-${(value.targeting?.length ?? 0) + 1}`,
                      query: "",
                      variation: names[0],
                    },
                  ],
                })
              }
            >
              <Plus size={16} /> Add targeting rule
            </button>
          </section>
          <section>
            <h3>Default rule</h3>
            <p className="muted">When no targeting rule matches.</p>
            <Outcome
              rule={value.defaultRule}
              names={names}
              change={(defaultRule) => change({ ...value, defaultRule })}
            />
          </section>
          <Field label="Tags (comma separated)">
            <input
              value={
                Array.isArray(value.metadata?.tags)
                  ? value.metadata.tags.join(",")
                  : ""
              }
              onChange={(e) =>
                change({
                  ...value,
                  metadata: {
                    ...value.metadata,
                    tags: e.target.value.split(","),
                  },
                })
              }
            />
          </Field>
        </>
      )}
      <ErrorBox error={error} />
      {error && (
        <input
          aria-label="Invalid payload"
          required
          value=""
          onChange={() => {}}
          className="validation-guard"
          tabIndex={-1}
        />
      )}
    </>
  );
}
function VariationValue({
  value,
  change,
}: {
  value: unknown;
  change: (v: unknown) => void;
}) {
  const [text, setText] = useState(pretty(value));
  if (typeof value === "boolean")
    return (
      <Select
        aria-label="Variation value"
        value={String(value)}
        onChange={(e) => change(e.target.value === "true")}
      >
        <option>true</option>
        <option>false</option>
      </Select>
    );
  if (typeof value === "string")
    return (
      <input
        aria-label="Variation value"
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    );
  if (typeof value === "number")
    return (
      <input
        aria-label="Variation value"
        type="number"
        step="any"
        value={value}
        onChange={(e) => change(Number(e.target.value))}
      />
    );
  return (
    <textarea
      aria-label="Variation JSON value"
      className="code"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        try {
          change(JSON.parse(e.target.value));
          e.target.setCustomValidity("");
        } catch {
          e.target.setCustomValidity("Invalid JSON");
        }
      }}
    />
  );
}

export function FlagEditor({
  id,
  flagset,
  edit,
  close,
  changed,
}: {
  id: string;
  flagset?: Flagset;
  edit: boolean;
  close: () => void;
  changed: () => void;
}) {
  const resource = useResource(() => api<Flag>(`/flags/${id}`), [id]);
  const [dirty, setDirty] = useState(false);
  const safeClose = () => {
    if (!dirty || window.confirm("Discard unpublished changes?")) close();
  };
  return (
    <Modal title={resource.data?.name ?? "Feature flag"} close={safeClose}>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorBox error={resource.error} />
      ) : (
        resource.data && (
          <FlagDetail
            key={`${id}-${resource.data.currentVersion}`}
            flag={resource.data}
            flagset={flagset}
            edit={edit}
            reload={() => {
              setDirty(false);
              resource.reload();
              changed();
            }}
            close={safeClose}
            dirtyChanged={setDirty}
          />
        )
      )}
    </Modal>
  );
}
function FlagDetail({
  flag,
  flagset,
  edit,
  reload,
  close,
  dirtyChanged,
}: {
  flag: Flag;
  flagset?: Flagset;
  edit: boolean;
  reload: () => void;
  close: () => void;
  dirtyChanged: (v: boolean) => void;
}) {
  const [tab, setTab] = useState("configuration");
  const [payload, setPayload] = useState(flag.payload);
  const [review, setReview] = useState(false);
  const [comment, setComment] = useState("");
  const [invalidDraft, setInvalidDraft] = useState(false);
  const dirty = invalidDraft || pretty(payload) !== pretty(flag.payload);
  useEffect(() => {
    dirtyChanged(dirty);
  }, [dirty, dirtyChanged]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const errors = validatePayload(payload);
  return (
    <>
      <div className="flag-meta">
        <span className={`status ${flag.disabled ? "" : "on"}`}>
          {flag.disabled ? "Disabled" : "Enabled"}
        </span>
        <span>Version {flag.currentVersion}</span>
        <span>{date(flag.updatedAt)}</span>
      </div>
      <div className="tabs">
        {["configuration", "test", "history"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "test" ? "Test evaluation" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div hidden={tab !== "configuration"}>
        <Form
          disabled={!edit}
          label={review ? "Publish changes" : "Review changes"}
          cancel={close}
          submit={async () => {
            if (invalidDraft)
              throw new Error("Fix the invalid JSON before publishing.");
            if (errors.length) throw new Error(errors.join("\n"));
            if (!review) {
              setReview(true);
              return;
            }
            const current = await api<Flag>(`/flags/${flag.id}`);
            if (current.currentVersion !== flag.currentVersion)
              throw new Error(
                "This flag changed while you were editing. Close and reopen it before saving to avoid overwriting changes.",
              );
            await api(`/flags/${flag.id}`, "PUT", { payload, comment });
            reload();
          }}
        >
          {!edit && (
            <p className="notice">
              Read-only access. Ask a team admin for editor permissions.
            </p>
          )}
          {review ? (
            <>
              <h3>Review before publishing</h3>
              <p>
                Changed sections:{" "}
                {payloadChanges(flag.payload, payload).join(", ") || "None"}
              </p>
              <div className="comparison">
                <div>
                  <h4>Current</h4>
                  <Json value={flag.payload} />
                </div>
                <div>
                  <h4>Proposed</h4>
                  <Json value={payload} />
                </div>
              </div>
              <Field label="Change comment">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Why are you making this change?"
                />
              </Field>
              <button type="button" onClick={() => setReview(false)}>
                Back to editor
              </button>
            </>
          ) : (
            <PayloadEditor
              value={payload}
              change={setPayload}
              invalid={setInvalidDraft}
            />
          )}
        </Form>
      </div>
      {tab === "test" && (
        <Evaluation flag={flag} flagset={flagset} dirty={dirty} />
      )}
      {tab === "history" && <History flag={flag} edit={edit} reload={reload} />}
    </>
  );
}
function Evaluation({
  flag,
  flagset,
  dirty,
}: {
  flag: Flag;
  flagset?: Flagset;
  dirty: boolean;
}) {
  const [context, setContext] = useState(
    pretty(
      flagset?.defaultTestingEvaluationContext ?? {
        targetingKey: "user-123",
        attributes: { email: "admin@local.io" },
      },
    ),
  );
  const [result, setResult] = useState<unknown>();
  return (
    <Form
      label="Run evaluation"
      submit={async () =>
        setResult(
          await api(`/flags/${flag.id}/evaluate`, "POST", {
            evaluationContext: objectJSON(context),
          }),
        )
      }
    >
      <p className="notice">
        Evaluates the saved version {flag.currentVersion}, including flagset
        enrichment. {dirty && "Your unpublished edits are not evaluated."}
      </p>
      <JsonInput
        label="Evaluation context"
        value={context}
        onChange={setContext}
      />
      {result !== undefined && (
        <>
          <h3>Evaluation result</h3>
          <Json value={result} />
        </>
      )}
    </Form>
  );
}
function History({
  flag,
  edit,
  reload,
}: {
  flag: Flag;
  edit: boolean;
  reload: () => void;
}) {
  const [page, setPage] = useState(1);
  const versions = useResource(
    () =>
      request<Page<Version>>(
        `/flags/${flag.id}/versions?page=${page}&pageSize=20`,
      ),
    [flag.id, page],
  );
  const [selected, setSelected] = useState<Version>();
  const [comment, setComment] = useState("");
  return (
    <>
      <ErrorBox error={versions.error} />
      {versions.loading ? (
        <Loading />
      ) : !versions.data?.data.length ? (
        <Empty title="No versions yet" />
      ) : (
        versions.data.data.map((v) => (
          <div className="history-row" key={v.id}>
            <div>
              <strong>Version {v.versionNumber}</strong>
              <p>{v.comment || "No comment"}</p>
              <small>
                {v.createdByName ?? "Unknown author"} · {date(v.createdAt)}
              </small>
            </div>
            <button onClick={() => setSelected(v)}>Compare / restore</button>
          </div>
        ))
      )}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={page >= (versions.data?.totalPages ?? 1)}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {selected && (
        <div className="panel">
          <h3>Version {selected.versionNumber} compared with current</h3>
          <div className="comparison">
            <Json value={selected.payload} />
            <Json value={flag.payload} />
          </div>
          <Form
            disabled={!edit || selected.versionNumber === flag.currentVersion}
            label={`Restore version ${selected.versionNumber}`}
            submit={async () => {
              await api(
                `/flags/${flag.id}/versions/${selected.versionNumber}/rollback`,
                "POST",
                { comment },
              );
              reload();
            }}
          >
            <p className="warning">
              Restoring creates a new version. It does not erase history or
              change the separate enabled/disabled state.
            </p>
            <Field label="Rollback comment">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
          </Form>
        </div>
      )}
    </>
  );
}
