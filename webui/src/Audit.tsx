import { Select } from "./Select";
import { useState } from "react";
import { request } from "./api";
import {
  Empty,
  ErrorBox,
  Field,
  Json,
  Loading,
  Modal,
  Pager,
  date,
  useResource,
} from "./ui";
import type { Audit as AuditEntry, Page, Team } from "./types";
export function Audit({ teams }: { teams: Team[] }) {
  const [team, setTeam] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [flagId, setFlagId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry>();
  const params = new URLSearchParams({
    teamId: team,
    action,
    flagId,
    page: String(page),
    pageSize: "25",
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
  });
  const resource = useResource(
    () => request<Page<AuditEntry>>(`/audit?${params}`),
    [params.toString()],
  );
  const filter = (setter: (s: string) => void, v: string) => {
    setter(v);
    setPage(1);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRACEABILITY</span>
          <h1>Audit log</h1>
          <p>Who changed what, and when. Scoped to your access.</p>
        </div>
      </div>
      <div className="toolbar">
        <Field label="Team">
          <Select
            value={team}
            onChange={(e) => filter(setTeam, e.target.value)}
          >
            <option value="">All accessible teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Action">
          <Select
            value={action}
            onChange={(e) => filter(setAction, e.target.value)}
          >
            <option value="">All actions</option>
            {["create", "update", "delete", "rollback"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => filter(setFrom, e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => filter(setTo, e.target.value)}
          />
        </Field>
        <Field label="Flag ID">
          <input
            value={flagId}
            onChange={(e) => filter(setFlagId, e.target.value)}
            placeholder="Optional UUID"
          />
        </Field>
      </div>
      <ErrorBox error={resource.error} />
      {resource.loading ? (
        <Loading />
      ) : !resource.data?.data.length ? (
        <Empty title="No audit entries" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.data.map((a) => (
                <tr key={a.id}>
                  <td>{date(a.occurredAt)}</td>
                  <td>{a.actorEmail ?? "Deleted user"}</td>
                  <td>
                    <span className="tag">{a.action}</span>
                  </td>
                  <td>
                    {a.targetType}
                    <small className="code">{a.targetId}</small>
                  </td>
                  <td>
                    <button onClick={() => setSelected(a)}>
                      Inspect change
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resource.data && (
        <Pager
          page={page}
          pages={resource.data.totalPages}
          total={resource.data.total}
          change={setPage}
        />
      )}
      {selected && (
        <Modal
          title={`${selected.action} ${selected.targetType}`}
          close={() => setSelected(undefined)}
        >
          <p>
            {selected.actorEmail} · {date(selected.occurredAt)}
          </p>
          <div className="comparison">
            <div>
              <h3>Before</h3>
              <Json value={selected.before ?? null} />
            </div>
            <div>
              <h3>After</h3>
              <Json value={selected.after ?? null} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
