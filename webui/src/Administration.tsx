import { Select } from "./Select";
import { useState } from "react";
import {
  Plus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Settings,
} from "lucide-react";
import { api } from "./api";
import {
  Confirm,
  Empty,
  ErrorBox,
  Field,
  Form,
  JsonInput,
  Loading,
  Modal,
  date,
  objectJSON,
  pretty,
  useResource,
} from "./ui";
import type { APIKey, Company, Flagset, Me, Member, Team } from "./types";

export function Members({
  path,
  admin,
  company = false,
  mono = false,
  currentUser,
}: {
  path: string;
  admin: boolean;
  company?: boolean;
  mono?: boolean;
  currentUser: string;
}) {
  const resource = useResource(() => api<Member[]>(`${path}/members`), [path]);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(company ? "member" : "viewer");
  const [remove, setRemove] = useState<Member>();
  const [update, setUpdate] = useState<{ member: Member; role: string }>();
  const roles = company ? ["member", "admin"] : ["viewer", "editor", "admin"];
  return (
    <>
      <div className="section-heading">
        <h3>Members</h3>
        <button disabled={!admin} onClick={() => setAdding(true)}>
          <Plus size={16} /> Add member
        </button>
      </div>
      <p className="muted">
        {company
          ? "In single-company mode, users join automatically after their first sign-in. Revoke access in the identity provider."
          : "Company admins inherit admin access. Explicit team roles apply to other members."}
      </p>
      <ErrorBox error={resource.error} />
      {resource.loading ? (
        <Loading />
      ) : !resource.data?.length ? (
        <Empty title="No explicit members" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name || m.email}</strong>
                    <small>
                      {m.email}
                      {m.userId === currentUser ? " · You" : ""}
                    </small>
                  </td>
                  <td>
                    <Select
                      aria-label={`Role for ${m.email}`}
                      disabled={!admin}
                      value={m.role}
                      onChange={(e) =>
                        setUpdate({ member: m, role: e.target.value })
                      }
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <button
                      aria-label={`Remove ${m.email}`}
                      disabled={!admin || (company && mono)}
                      onClick={() => setRemove(m)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && (
        <Modal title="Add member" close={() => setAdding(false)}>
          <Form
            label="Add member"
            cancel={() => setAdding(false)}
            submit={async () => {
              await api(`${path}/members`, "POST", { email, role });
              setAdding(false);
              setEmail("");
              resource.reload();
            }}
          >
            <p>
              The user must sign in to Studio first.
              {!company && " The user must also belong to this company."}
            </p>
            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Role">
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Remove member"
          message={`Remove ${remove.email} from this ${company ? "company" : "team"}?`}
          action={async () => {
            await api(`${path}/members/${remove.userId}`, "DELETE");
            resource.reload();
          }}
          close={() => setRemove(undefined)}
        />
      )}
      {update && (
        <Modal title="Change member role" close={() => setUpdate(undefined)}>
          <Form
            label="Change role"
            cancel={() => setUpdate(undefined)}
            submit={async () => {
              await api(`${path}/members/${update.member.userId}`, "PATCH", {
                role: update.role,
              });
              setUpdate(undefined);
              resource.reload();
            }}
          >
            <p>
              Change {update.member.email} from {update.member.role} to{" "}
              {update.role}? Your own access may change immediately.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}

export function Flagsets({
  team,
  sets,
  edit,
  admin,
  reload,
}: {
  team: Team;
  sets: Flagset[];
  edit: boolean;
  admin: boolean;
  reload: () => void;
}) {
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<Flagset>();
  const [remove, setRemove] = useState<Flagset>();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONFIGURATION / {team.name}</span>
          <h1>Flagsets</h1>
          <p>Isolated flag collections, connected to your relay proxies.</p>
        </div>
        <button
          className="primary"
          disabled={!edit}
          onClick={() => setCreate(true)}
        >
          <Plus size={16} /> Create flagset
        </button>
      </div>
      <div className="card-grid">
        {sets.map((f) => (
          <article className="panel flagset-card" key={f.id}>
            <div className="section-heading">
              <h2>{f.name}</h2>
              <span className="tag">Flagset</span>
            </div>
            <p>{f.description || "No description"}</p>
            <div className="flagset-counts">
              <span>
                <strong>{f.flagCount}</strong>flags
              </span>
              <span>
                <strong>{f.enabledFlagCount}</strong>enabled
              </span>
              <span>
                <strong>{f.apiKeyCount}</strong>keys
              </span>
            </div>
            <div className="actions">
              <button onClick={() => setSelected(f)}>
                <Settings size={16} /> Settings & keys
              </button>
              <button
                aria-label={`Delete flagset ${f.name}`}
                disabled={!admin}
                onClick={() => setRemove(f)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!sets.length && (
        <Empty title="Create your first flagset">
          <p>
            Use separate flagsets for production and staging, or for independent
            applications.
          </p>
        </Empty>
      )}
      {create && (
        <FlagsetForm team={team} close={() => setCreate(false)} done={reload} />
      )}
      {selected && (
        <Modal
          title={`${selected.name} settings`}
          close={() => setSelected(undefined)}
        >
          <FlagsetSettings
            id={selected.id}
            admin={admin}
            edit={edit}
            changed={reload}
          />
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Delete flagset"
          message={`Delete “${remove.name}”, all its flags, history, and relay-proxy keys?`}
          action={async () => {
            await api(`/flagsets/${remove.id}`, "DELETE");
            reload();
          }}
          close={() => setRemove(undefined)}
        />
      )}
    </>
  );
}
function FlagsetForm({
  team,
  existing,
  close,
  done,
  admin = true,
}: {
  team?: Team;
  existing?: Flagset;
  close: () => void;
  done: () => void;
  admin?: boolean;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [enrichment, setEnrichment] = useState(
    pretty(existing?.evaluationContextEnrichment ?? {}),
  );
  const [context, setContext] = useState(
    pretty(
      existing?.defaultTestingEvaluationContext ?? {
        targetingKey: "user-123",
        attributes: {},
      },
    ),
  );
  return (
    <Form
      disabled={!admin}
      label={existing ? "Save flagset" : "Create flagset"}
      cancel={existing ? undefined : close}
      submit={async () => {
        await api(
          existing ? `/flagsets/${existing.id}` : `/teams/${team!.id}/flagsets`,
          existing ? "PATCH" : "POST",
          {
            name,
            description,
            evaluationContextEnrichment: objectJSON(enrichment),
            defaultTestingEvaluationContext: objectJSON(context),
          },
        );
        done();
        if (!existing) close();
      }}
    >
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <JsonInput
        label="Evaluation context enrichment"
        value={enrichment}
        onChange={setEnrichment}
        rows={5}
      />
      <p className="hint">
        Merged into every evaluation; enrichment wins on key collision.
      </p>
      <JsonInput
        label="Default test context"
        value={context}
        onChange={setContext}
        rows={5}
      />
    </Form>
  );
}
function FlagsetSettings({
  id,
  admin,
  edit,
  changed,
}: {
  id: string;
  admin: boolean;
  edit: boolean;
  changed: () => void;
}) {
  const resource = useResource(() => api<Flagset>(`/flagsets/${id}`), [id]);
  return (
    <>
      <ErrorBox error={resource.error} />
      {resource.loading ? (
        <Loading />
      ) : (
        resource.data && (
          <FlagsetForm
            key={pretty(resource.data)}
            existing={resource.data}
            admin={admin}
            close={() => {}}
            done={() => {
              resource.reload();
              changed();
            }}
          />
        )
      )}
      <section>
        <h3>
          <KeyRound size={18} /> Relay-proxy API keys
        </h3>
        {edit ? (
          <Keys id={id} admin={admin} changed={changed} />
        ) : (
          <p className="notice">
            Viewer access cannot read relay-proxy credentials. Ask a team editor
            or admin.
          </p>
        )}
      </section>
    </>
  );
}
function Keys({
  id,
  admin,
  changed,
}: {
  id: string;
  admin: boolean;
  changed: () => void;
}) {
  const resource = useResource(
    () => api<APIKey[]>(`/flagsets/${id}/api-keys`),
    [id],
  );
  const [label, setLabel] = useState("");
  const [remove, setRemove] = useState<APIKey>();
  return (
    <>
      <p className="warning">
        These keys grant relay-proxy access outside Studio's user roles. Keep
        them secret.
      </p>
      <ErrorBox error={resource.error} />
      {resource.data?.map((k) => (
        <KeyRow key={k.id} item={k} admin={admin} revoke={() => setRemove(k)} />
      ))}
      {admin && (
        <Form
          label="Create key"
          submit={async () => {
            await api(`/flagsets/${id}/api-keys`, "POST", { label });
            setLabel("");
            resource.reload();
            changed();
          }}
        >
          <Field label="Key label">
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="relay-proxy-production"
            />
          </Field>
        </Form>
      )}
      {remove && (
        <Confirm
          title="Revoke API key"
          message={`Revoke “${remove.label}”? Connected relay proxies will lose access.`}
          action={async () => {
            await api(`/flagsets/${id}/api-keys/${remove.id}`, "DELETE");
            resource.reload();
            changed();
          }}
          close={() => setRemove(undefined)}
        />
      )}
    </>
  );
}
function KeyRow({
  item,
  admin,
  revoke,
}: {
  item: APIKey;
  admin: boolean;
  revoke: () => void;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState("");
  return (
    <div className="key-row">
      <strong>{item.label}</strong>
      <code>{show ? item.apiKey : "••••••••••••••••••••••••••••"}</code>
      <small>{date(item.createdAt)}</small>
      <div className="actions">
        <button
          aria-label={`${show ? "Hide" : "Reveal"} ${item.label}`}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          aria-label={`Copy ${item.label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(item.apiKey);
              setCopied("Copied");
            } catch {
              setCopied(
                "Copy unavailable. Reveal the key and copy it manually.",
              );
            }
          }}
        >
          <Copy size={16} />
        </button>
        <button
          disabled={!admin}
          aria-label={`Revoke ${item.label}`}
          onClick={revoke}
        >
          <Trash2 size={16} />
        </button>
        <small role="status">{copied}</small>
      </div>
    </div>
  );
}

export function TeamSettings({
  team,
  me,
  admin,
  changed,
}: {
  team: Team;
  me: Me;
  admin: boolean;
  changed: () => void;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [remove, setRemove] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCESS & OWNERSHIP</span>
          <h1>Team settings</h1>
          <p>Manage {team.name} and the people who can ship with it.</p>
        </div>
      </div>
      <div className="panel">
        <Form
          disabled={!admin}
          submit={async () => {
            await api(`/teams/${team.id}`, "PATCH", { name, description });
            changed();
          }}
        >
          <Field label="Team name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </Form>
      </div>
      <section>
        <Members
          path={`/teams/${team.id}`}
          admin={admin}
          currentUser={me.user.id}
        />
      </section>
      {admin && (
        <section className="danger-zone">
          <h3>Delete team</h3>
          <p>Deletes all flagsets, flags and API keys in this team.</p>
          <button className="danger" onClick={() => setRemove(true)}>
            Delete team
          </button>
        </section>
      )}
      {remove && (
        <Confirm
          title="Delete team"
          message={`Permanently delete ${team.name} and everything inside it?`}
          action={async () => {
            await api(`/teams/${team.id}`, "DELETE");
            changed();
          }}
          close={() => setRemove(false)}
        />
      )}
    </>
  );
}
export function NewTeam({
  companyId,
  close,
  done,
}: {
  companyId: string;
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Modal title="Create team" close={close}>
      <Form
        label="Create team"
        cancel={close}
        submit={async () => {
          await api(`/companies/${companyId}/teams`, "POST", {
            name,
            description,
            adminEmail: email,
          });
          done();
          close();
        }}
      >
        <Field label="Team name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field
          label="First team admin email"
          hint="An existing member of this company."
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </Form>
    </Modal>
  );
}
export function Companies({
  me,
  mono,
  changed,
}: {
  me: Me;
  mono: boolean;
  changed: () => void;
}) {
  const companies = useResource(
    async () =>
      me.user.isSuperAdmin
        ? await api<Company[]>("/companies")
        : me.company
          ? [await api<Company>(`/companies/${me.company.companyId}`)]
          : [],
    [me.user.isSuperAdmin, me.company?.companyId],
  );
  const [id, setId] = useState(me.company?.companyId ?? "");
  const [creating, setCreating] = useState(false);
  const selected =
    companies.data?.find((c) => c.id === id) ?? companies.data?.[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORGANIZATION</span>
          <h1>Companies</h1>
          <p>Company membership and administrative access.</p>
        </div>
        {me.user.isSuperAdmin && !mono && (
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create company
          </button>
        )}
      </div>
      <ErrorBox error={companies.error} />
      {companies.data && companies.data.length > 1 && (
        <Field label="Company">
          <Select
            value={selected?.id ?? ""}
            onChange={(e) => setId(e.target.value)}
          >
            {companies.data.map((c) => (
              <option value={c.id} key={c.id}>
                {c.displayName}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {selected && (
        <CompanySettings
          key={selected.id}
          company={selected}
          me={me}
          mono={mono}
          changed={() => {
            companies.reload();
            changed();
          }}
        />
      )}{" "}
      {!companies.loading && !selected && <Empty title="No company yet" />}
      {creating && (
        <CompanyForm
          close={() => setCreating(false)}
          done={() => {
            companies.reload();
            changed();
          }}
          superAdmin
        />
      )}
    </>
  );
}
function CompanySettings({
  company,
  me,
  mono,
  changed,
}: {
  company: Company;
  me: Me;
  mono: boolean;
  changed: () => void;
}) {
  const [name, setName] = useState(company.displayName);
  const [description, setDescription] = useState(company.description);
  const [remove, setRemove] = useState(false);
  const admin =
    me.user.isSuperAdmin ||
    (me.company?.companyId === company.id && me.company.role === "admin");
  return (
    <>
      <div className="panel">
        <Form
          disabled={!admin}
          submit={async () => {
            await api(`/companies/${company.id}`, "PATCH", {
              displayName: name,
              description,
            });
            changed();
          }}
        >
          <Field label="Display name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </Form>
      </div>
      <section>
        <Members
          path={`/companies/${company.id}`}
          admin={admin}
          company
          mono={mono}
          currentUser={me.user.id}
        />
      </section>
      {me.user.isSuperAdmin && (
        <section className="danger-zone">
          <h3>Delete company</h3>
          <p>
            Deletes the company and every team, flagset, flag and key in it.
          </p>
          <button className="danger" onClick={() => setRemove(true)}>
            Delete company
          </button>
        </section>
      )}
      {remove && (
        <Confirm
          title="Delete company"
          message={`Delete ${company.displayName} and all managed resources?`}
          action={async () => {
            await api(`/companies/${company.id}`, "DELETE");
            changed();
          }}
          close={() => setRemove(false)}
        />
      )}
    </>
  );
}
export function CompanyForm({
  close,
  done,
  superAdmin = false,
}: {
  close: () => void;
  done: () => void;
  superAdmin?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Modal
      title={superAdmin ? "Create company" : "Welcome to Studio"}
      close={close}
    >
      <Form
        label="Create company"
        submit={async () => {
          await api(superAdmin ? "/companies" : "/onboarding/company", "POST", {
            displayName: name,
            description,
            ...(superAdmin ? { adminEmail: email } : {}),
          });
          done();
          close();
        }}
      >
        <p>
          {superAdmin
            ? "Assign an existing user without a company as the first admin."
            : "Create a company to start organizing teams and feature flags."}
        </p>
        <Field label="Company name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {superAdmin && (
          <Field label="First admin email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        )}
      </Form>
    </Modal>
  );
}
