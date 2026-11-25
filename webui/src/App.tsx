import { Select } from "./Select";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Flag,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Zap,
} from "lucide-react";
import { api, errorText } from "./api";
import { Empty, ErrorBox, Loading, useResource } from "./ui";
import { Flags } from "./Flags";
import {
  Companies,
  CompanyForm,
  Flagsets,
  NewTeam,
  TeamSettings,
} from "./Administration";
import { Audit } from "./Audit";
import { canEdit } from "./payload";
import type { Flagset, Me, Team } from "./types";

export default function App() {
  const [revision, setRevision] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const session = useResource(
    async () => ({
      me: await api<Me>("/auth/me"),
      config: await api<{ monoCompany: boolean }>("/config"),
    }),
    [revision],
  );
  useEffect(() => {
    const expired = () => setSessionExpired(true);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  if (session.loading) return <Loading />;
  if (sessionExpired || !session.data)
    return (
      <div className="login">
        <div className="brand">
          <Zap /> GO Feature Flag <span>STUDIO</span>
        </div>
        <div className="login-card">
          <span className="eyebrow">CONTROL YOUR RELEASES</span>
          <h1>
            Ship code.
            <br />
            Release with confidence.
          </h1>
          <p>
            A workspace for feature flags, targeting rules, and the people
            behind every release.
          </p>
          <ErrorBox
            error={
              session.error && !session.error.includes("unauthenticated")
                ? session.error
                : ""
            }
          />
          <a className="button primary" href="/auth/login">
            Sign in with your identity provider <ChevronRight size={18} />
          </a>
          <small>Your organization’s sign-in protects this workspace.</small>
        </div>
      </div>
    );
  return (
    <Workspace
      me={session.data.me}
      mono={session.data.config.monoCompany}
      changed={() => setRevision((v) => v + 1)}
    />
  );
}
function Workspace({
  me,
  mono,
  changed,
}: {
  me: Me;
  mono: boolean;
  changed: () => void;
}) {
  const [view, setView] = useState(
    () => window.location.hash.slice(1) || "flags",
  );
  const [teamId, setTeamId] = useState("");
  const [newTeam, setNewTeam] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [error, setError] = useState("");
  const teams = useResource(
    () => api<Team[]>("/teams"),
    [me.user.id, me.company?.companyId],
  );
  const team = teams.data?.find((t) => t.id === teamId) ?? teams.data?.[0];
  const flagsets = useResource(
    () =>
      team ? api<Flagset[]>(`/teams/${team.id}/flagsets`) : Promise.resolve([]),
    [team?.id],
  );
  const companyAdmin = me.user.isSuperAdmin || me.company?.role === "admin";
  const role = companyAdmin
    ? "admin"
    : me.membership?.find((t) => t.teamId === team?.id)?.role;
  const edit = canEdit(role);
  const admin = role === "admin";
  useEffect(() => {
    const onHash = () => setView(window.location.hash.slice(1) || "flags");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function refresh() {
    teams.reload();
    flagsets.reload();
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      window.location.assign("/");
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <div className="app">
      <aside>
        <a href="#flags" className="brand">
          <Zap size={21} /> GO Feature Flag <span>STUDIO</span>
        </a>
        <div className="workspace-label">
          {me.company?.companyDisplayName ?? "Your workspace"}
        </div>
        <label className="field">
          <span>Team</span>
          <Select
            aria-label="Select team"
            value={team?.id ?? ""}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {!teams.data?.length && <option value="">No teams</option>}
            {teams.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>
        {companyAdmin && me.company && (
          <button className="subtle" onClick={() => setNewTeam(true)}>
            <Plus size={15} /> New team
          </button>
        )}
        <nav aria-label="Main navigation">
          {[
            { id: "flags", icon: Flag, label: "Feature flags" },
            { id: "flagsets", icon: Layers, label: "Flagsets" },
            { id: "audit", icon: Activity, label: "Audit log" },
            { id: "team", icon: Settings, label: "Team settings" },
            { id: "companies", icon: Shield, label: "Companies" },
          ].map(({ id, icon: Icon, label }) => (
            <a key={id} href={`#${id}`} className={view === id ? "active" : ""}>
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="/swagger/index.html"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={17} /> API reference
          </a>
          <p className="notice">
            GO Feature Flag Studio
            <br />
            <small>Management API connected</small>
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            {me.company?.companyDisplayName ?? "Studio"}{" "}
            <ChevronRight size={14} /> {team?.name ?? "Workspace"}
          </span>
          <div className="actions">
            <span className="tag">
              {me.user.isSuperAdmin ? "Super admin" : (role ?? "Member")}
            </span>
            <button aria-label="Refresh workspace" onClick={refresh}>
              <RefreshCw size={16} />
            </button>
            <span className="user-name" title={me.user.email}>
              {me.user.name || me.user.email}
            </span>
            <button aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main>
          <ErrorBox error={error || teams.error || flagsets.error} />
          {!me.company && (
            <div className="notice">
              <strong>No company membership yet.</strong>
              <p>
                {mono && !me.user.isSuperAdmin
                  ? "An administrator must create the company first. Sign out and back in after they do so."
                  : "Create a company to start managing teams and flags."}
              </p>
              {(!mono || me.user.isSuperAdmin) && (
                <button className="primary" onClick={() => setOnboard(true)}>
                  Set up company
                </button>
              )}
            </div>
          )}
          {view === "audit" ? (
            <Audit teams={teams.data ?? []} />
          ) : view === "companies" ? (
            <Companies me={me} mono={mono} changed={changed} />
          ) : teams.loading ? (
            <Loading />
          ) : !team ? (
            <Empty title="Your release workspace starts with a team">
              <p>Create a team to group people, flagsets and feature flags.</p>
              {companyAdmin && me.company && (
                <button className="primary" onClick={() => setNewTeam(true)}>
                  Create team
                </button>
              )}
            </Empty>
          ) : flagsets.loading ? (
            <Loading />
          ) : view === "flagsets" ? (
            <Flagsets
              key={team.id}
              team={team}
              sets={flagsets.data ?? []}
              edit={edit}
              admin={admin}
              reload={flagsets.reload}
            />
          ) : view === "team" ? (
            <TeamSettings
              key={team.id}
              team={team}
              me={me}
              admin={admin}
              changed={() => {
                refresh();
                changed();
              }}
            />
          ) : (
            <Flags
              key={team.id}
              team={team}
              flagsets={flagsets.data ?? []}
              editable={edit}
            />
          )}
        </main>
      </div>
      {newTeam && me.company && (
        <NewTeam
          companyId={me.company.companyId}
          close={() => setNewTeam(false)}
          done={() => {
            refresh();
            changed();
          }}
        />
      )}{" "}
      {onboard && (
        <CompanyForm close={() => setOnboard(false)} done={changed} />
      )}
    </div>
  );
}
