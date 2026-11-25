import { Select } from "./Select";
import { useState } from "react";
import { Flag as FlagIcon, Plus, Search, Trash2, Copy } from "lucide-react";
import { api, errorText, request } from "./api";
import {
  Confirm,
  Empty,
  ErrorBox,
  Field,
  Form,
  Loading,
  Modal,
  Pager,
  date,
  useResource,
} from "./ui";
import { initialPayload, validatePayload } from "./payload";
import { FlagEditor, PayloadEditor } from "./FlagEditor";
import type { Flag, FlagRow, Flagset, Page, Payload, Team } from "./types";

export function Flags({
  team,
  flagsets,
  editable,
}: {
  team: Team;
  flagsets: Flagset[];
  editable: boolean;
}) {
  const [name, setName] = useState("");
  const [flagset, setFlagset] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FlagRow>();
  const [create, setCreate] = useState(false);
  const [duplicate, setDuplicate] = useState<Flag>();
  const [remove, setRemove] = useState<FlagRow>();
  const [toggle, setToggle] = useState<FlagRow>();
  const [error, setError] = useState("");
  const params = new URLSearchParams({
    name,
    flagsetId: flagset,
    disabled: state,
    type,
    tags,
    owner,
    sort,
    page: String(page),
    pageSize: "25",
  });
  const flags = useResource(
    () => request<Page<FlagRow>>(`/teams/${team.id}/flags?${params}`),
    [team.id, params.toString()],
  );
  const options = useResource(
    () =>
      Promise.all([
        api<string[]>(`/teams/${team.id}/tags`),
        api<{ id: string; name: string }[]>(`/teams/${team.id}/owners`),
      ]),
    [team.id],
  );
  const filter = (set: (v: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RELEASE CONTROL / {team.name}</span>
          <h1>Feature flags</h1>
          <p>Decide who gets what. Ship at your own pace.</p>
        </div>
        <button
          className="primary"
          disabled={!editable || !flagsets.length}
          onClick={() => setCreate(true)}
        >
          <Plus size={17} /> Create flag
        </button>
      </div>
      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search flags"
            placeholder="Find a feature flag…"
            value={name}
            onChange={(e) => filter(setName)(e.target.value)}
          />
        </label>
        <Select
          aria-label="Filter flagset"
          value={flagset}
          onChange={(e) => filter(setFlagset)(e.target.value)}
        >
          <option value="">All flagsets</option>
          {flagsets.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter status"
          value={state}
          onChange={(e) => filter(setState)(e.target.value)}
        >
          <option value="">All states</option>
          <option value="false">Enabled</option>
          <option value="true">Disabled</option>
        </Select>
        <Select
          aria-label="Filter type"
          value={type}
          onChange={(e) => filter(setType)(e.target.value)}
        >
          <option value="">All types</option>
          {["boolean", "string", "int", "float", "json"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter tag"
          value={tags}
          onChange={(e) => filter(setTags)(e.target.value)}
        >
          <option value="">All tags</option>
          {options.data?.[0]?.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter owner"
          value={owner}
          onChange={(e) => filter(setOwner)(e.target.value)}
        >
          <option value="">All owners</option>
          <option value="__unassigned__">Unassigned</option>
          {options.data?.[1]?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name || o.id}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort flags"
          value={sort}
          onChange={(e) => filter(setSort)(e.target.value)}
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name</option>
          <option value="state">State</option>
        </Select>
      </div>
      <ErrorBox error={error || flags.error} />
      {flags.loading ? (
        <Loading />
      ) : !flags.data?.data.length ? (
        <Empty title="No flags in this view">
          <p>
            {flagsets.length
              ? "Create a flag, or adjust the filters above."
              : "Create a flagset first to group flags and connect a relay proxy."}
          </p>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Feature flag</th>
                <th>State</th>
                <th>Default distribution</th>
                <th>Owner / updated</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.data.data.map((f) => (
                <tr key={f.id}>
                  <td>
                    <button
                      className="flag-name"
                      onClick={() => setSelected(f)}
                    >
                      <FlagIcon size={17} />
                      {f.name}
                    </button>
                    <div className="row-meta">
                      <span>{f.flagsetName}</span>
                      <span>{f.type}</span>
                      <span>{f.targetingRuleCount} rules</span>
                      {f.tags?.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      role="switch"
                      aria-checked={!f.disabled}
                      aria-label={`${f.disabled ? "Enable" : "Disable"} ${f.name}`}
                      className={`switch ${f.disabled ? "" : "on"}`}
                      disabled={!editable}
                      onClick={() => setToggle(f)}
                    >
                      <span />
                    </button>
                    <small>{f.disabled ? "Disabled" : "Enabled"}</small>
                  </td>
                  <td>
                    <Distribution flag={f} />
                  </td>
                  <td>
                    {f.owner || "Unassigned"}
                    <small>{date(f.updatedAt)}</small>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        aria-label={`Duplicate ${f.name}`}
                        disabled={!editable}
                        onClick={async () => {
                          try {
                            setDuplicate(await api<Flag>(`/flags/${f.id}`));
                            setCreate(true);
                          } catch (e) {
                            setError(errorText(e));
                          }
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        aria-label={`Delete ${f.name}`}
                        disabled={!editable}
                        onClick={() => setRemove(f)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {flags.data && (
        <Pager
          page={page}
          pages={flags.data.totalPages}
          total={flags.data.total}
          change={setPage}
        />
      )}
      {selected && (
        <FlagEditor
          id={selected.id}
          flagset={flagsets.find((f) => f.id === selected.flagsetId)}
          edit={editable}
          close={() => setSelected(undefined)}
          changed={flags.reload}
        />
      )}
      {create && (
        <CreateFlag
          flagsets={flagsets}
          source={duplicate}
          close={() => {
            setCreate(false);
            setDuplicate(undefined);
          }}
          done={flags.reload}
        />
      )}
      {remove && (
        <Confirm
          title="Delete flag"
          message={`Permanently delete “${remove.name}” and its history? Relay proxies will no longer receive this flag.`}
          action={async () => {
            await api(`/flags/${remove.id}`, "DELETE");
            flags.reload();
          }}
          close={() => setRemove(undefined)}
        />
      )}
      {toggle && (
        <Modal
          title={`${toggle.disabled ? "Enable" : "Disable"} ${toggle.name}`}
          close={() => setToggle(undefined)}
        >
          <Form
            label={toggle.disabled ? "Enable flag" : "Disable flag"}
            cancel={() => setToggle(undefined)}
            submit={async () => {
              await api(`/flags/${toggle.id}/disable`, "POST", {
                disabled: !toggle.disabled,
              });
              flags.reload();
              setToggle(undefined);
            }}
          >
            <p>
              This changes the live serving state of this flag. Disabling does
              not mean serving the “off” variation; SDK callers use their
              configured fallback when the flag is disabled.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Distribution({ flag }: { flag: FlagRow }) {
  if (flag.progressiveRollout)
    return (
      <span className="tag">
        Progressive · {flag.progressiveRollout.from} →{" "}
        {flag.progressiveRollout.to}%
      </span>
    );
  const entries = Object.entries(flag.distribution ?? {});
  return (
    <div className="distribution">
      <div className="distribution-bar">
        {entries.map(([name, value], i) => (
          <span
            key={name}
            className={`variation-color-${i % 4}`}
            style={{ width: `${value}%` }}
            title={`${name}: ${value}%`}
          />
        ))}
      </div>
      <small>
        {entries.map(([name, value]) => `${name} ${value}%`).join(" / ") ||
          "No default distribution"}
      </small>
    </div>
  );
}
function CreateFlag({
  flagsets,
  source,
  close,
  done,
}: {
  flagsets: Flagset[];
  source?: Flag;
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState(source ? `${source.name}-copy` : "");
  const [flagsetId, setFlagsetId] = useState(
    source?.flagsetId ?? flagsets[0]?.id ?? "",
  );
  const [type, setType] = useState("boolean");
  const [payload, setPayload] = useState<Payload>(
    source?.payload ?? initialPayload("boolean"),
  );
  const [comment, setComment] = useState("");
  return (
    <Modal
      title={source ? "Duplicate feature flag" : "Create feature flag"}
      close={close}
    >
      <Form
        label="Create flag"
        cancel={close}
        submit={async () => {
          const errors = validatePayload(payload);
          if (errors.length) throw new Error(errors.join("\n"));
          await api(`/flagsets/${flagsetId}/flags`, "POST", {
            name,
            comment,
            payload,
          });
          done();
          close();
        }}
      >
        <div className="form-grid">
          <Field
            label="Flag key"
            hint="Immutable. Use a stable key in your SDK."
          >
            <input
              required
              maxLength={200}
              pattern="[^\s]+"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new-checkout"
            />
          </Field>
          <Field label="Flagset">
            <Select
              required
              value={flagsetId}
              onChange={(e) => setFlagsetId(e.target.value)}
            >
              {flagsets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          {!source && (
            <Field label="Value type">
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPayload(initialPayload(e.target.value));
                }}
              >
                {["boolean", "string", "number", "json"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Change comment">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        </div>
        <PayloadEditor value={payload} change={setPayload} />
      </Form>
    </Modal>
  );
}
