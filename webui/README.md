# Studio Web UI

A React + TypeScript interface for the existing Studio management API. UI copy and documentation are in English.

## Local development

Requirements: Node.js 22.12+ (or 20.19+), npm, Go (the module's toolchain is downloaded automatically), Docker-compatible runtime, PostgreSQL 18 and Keycloak. Kiri works through the Docker CLI/context.

Add `127.0.0.1 goff.local` to `/etc/hosts` once. From the repository root:

```sh
make dev
# Infrastructure already running:
make dev ARGS=--no-infra
```

Open **http://goff.local:5173**. `make dev` installs dependencies with `npm ci` if needed, starts Vite and the API, and starts/waits for Compose infrastructure unless `--no-infra` is passed. Ctrl+C stops the UI and API but leaves infrastructure/data intact. Stop infrastructure with `docker compose -f server/management/compose.yaml stop`.

The supervisor sets both the OIDC callback and post-login redirect to the UI origin. Vite forwards `/auth` and `/api` to the API; the browser only talks to `goff.local:5173`. Cookies remain HttpOnly and are never copied into JavaScript storage. The API explicitly trusts the configured UI origin for writes. Do not use `localhost:5173` with the development realm: its redirect allowlist expects `goff.local`.

The imported local realm provides:

| Username | Password | Purpose |
|---|---|---|
| `admin@local` | `admin` | Studio super admin (`admin@local.io`) |
| `user@local` | `user` | Regular user |
| `user1@local` | `user1` | Regular user |
| `user2@local` | `user2` | Regular user |

These are development-only credentials. The Keycloak administration console (`http://localhost:8180`, `admin` / `admin`) manages identity accounts, not feature flags.

## Workflow

1. Sign in. If no company exists, the super admin sets one up. In single-company mode, subsequent sign-ins automatically join that company.
2. Create a team, assigning an existing company member (possibly yourself) as its first admin.
3. In **Flagsets**, create a collection such as `production` or `staging`. These are independent collections, not synchronized environments.
4. In **Feature flags**, create a boolean, string, numeric or JSON flag. Its key and value type are immutable after creation.
5. Edit variations, ordered targeting queries, single-variation outcomes, percentage splits and progressive rollouts. **Advanced JSON** exposes GOFF's full payload, including scheduled rollouts, experimentation windows, metadata and bucketing. The server is the authority for validation.
6. Review the current/proposed configuration and publish with a comment. **Test evaluation** runs the saved version through the real backend engine, not unpublished edits.
7. Use **History** to inspect versions and restore a previous payload as a new version. The enabled/disabled state is managed separately.
8. Connect your relay proxy using **Flagsets → Settings & keys**. Editors may read keys; only admins create/revoke them. Keys are masked until revealed and never persisted in browser storage.
9. Manage explicit team access in **Team settings**, company roles in **Companies**, and inspect changes in **Audit log**.

Viewers cannot mutate configuration. Company admins inherit team admin access. The backend enforces all authorization; disabled controls are only a usability aid. Destructive actions require confirmation and live serving changes are explained explicitly.

## Commands

```sh
make dev-api                  # API only, previous workflow
make web-build                # typecheck + production build
make web-test                 # Vitest transport, payload and component tests
cd webui && npm ci            # reproducible dependency installation
cd webui && npm run dev       # UI only; configure/start API separately
```

`GOFF_MGMT_SERVER_PORT` controls the API target used by Vite. UI port 5173 is strict to avoid silently changing the registered callback. API-only script flags remain available via `ARGS`; `--rebuild-infra` deletes the development database volume. Do not use it on data you want to keep.

## Deployment

`npm run build` produces `webui/dist`. Serve those static assets with SPA fallback to `index.html`. On the same public origin, reverse proxy `/api/*` and `/auth/*` to the management API. Set the OIDC redirect to `https://<host>/auth/callback` and `auth.postLoginRedirect=/`. Use HTTPS, secure cookies, production secrets, and a production OIDC provider. See `../docs/deployment.md` for the API settings. Vite's development/preview servers are not production hosting.

## Scope and current limitations

This is a first functional management UI over the APIs already implemented, **not parity with every feature-flag SaaS**. No billing, approval workflows, reusable segment service, experiment analytics, live evaluation telemetry, cross-environment promotion, webhooks or SDK installation automation has been added. GOFF experimentation payloads configure time windows; they are not an A/B statistical analysis service.

Advanced scheduled/experimentation/query-format settings use JSON rather than dedicated visual forms. History comparison shows complete side-by-side payloads, not a line diff. Audit filter inputs cover team/action/time/flag; backend access controls restrict results.

Before publishing, the UI checks whether the flag version has changed since editing started. The API does not yet offer atomic compare-and-swap/ETag writes: simultaneous publishes can still race after that check. Coordinate edits until optimistic concurrency is implemented server-side.

Browser smoke verification covered Keycloak login, flag list, evaluation, history, company views, and creating/publishing/deleting an isolated test flag. It does not replace a full production security and E2E test suite.
