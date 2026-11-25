# Container images and GHCR

## Published images

The `Container images` GitHub Actions workflow builds two Linux AMD64 images:

- `ghcr.io/lmquang/studio-api`: management API, static Go binary, non-root distroless runtime.
- `ghcr.io/lmquang/studio-webui`: built React assets served by non-root nginx on port 8080.

Names derive from `${github.repository}-api` and `${github.repository}-webui`, lowercased, so forks publish to their own namespace.

| Event | Behavior | Tags |
| --- | --- | --- |
| Pull request touching container inputs | Build only; no registry login/push | Local build metadata only |
| Push to `main` touching container inputs | Build and push both images | `latest`, `sha-<full-commit>` |
| Push tag `v*` | Build and push both images | Original tag; also normalized semver for valid versions (e.g. `v1.2.3`, `1.2.3`), `sha-<full-commit>` |

Release tags never move `latest`; that tag tracks `main`. Tags are not immutable: deploy using the published image digest when reproducibility matters. Builds include OCI source/revision labels, provenance and SBOM attestations. GitHub Actions caches are scoped by component.

Publishing uses the automatically issued `GITHUB_TOKEN` with `packages: write`; no PAT or registry password secret is needed. Fork PRs do not log in or push. Repository/organization policy must allow package creation. If a pre-existing package rejects publication, grant this repository Actions access in the package settings. Package visibility is managed separately in GHCR; private images require authenticated pulls.

Nothing is published by a local build. Push/merge the workflow and source into GitHub to trigger it. Existing server and Web UI workflows remain the test/lint checks; require those checks in branch protection before merging. The Web UI container build also runs its tests and TypeScript build.

## Build locally

Run from the repository root:

```sh
docker build -f server/management/Dockerfile -t studio-api:local .
docker build -f webui/Dockerfile -t studio-webui:local .
```

The API builder Go version matches `server/management/go.mod`; update the Dockerfile when updating Go. `.dockerignore` excludes local environment secrets, node_modules and build output. Never pass runtime secrets through build arguments.

## Runtime wiring

Use a private container network. Name the API service `api`, or set the Web UI container's `API_UPSTREAM` environment variable to an HTTP upstream reachable from that container (default `http://api:8080`, no trailing path). Both images listen on port 8080. Only expose the Web UI/reverse proxy publicly.

The Web UI forwards `/api`, `/auth` and `/swagger` to the management API without changing the path. Other routes serve static assets with SPA fallback. `/healthz` checks nginx; the API's `/health` endpoint is separate. Changing `API_UPSTREAM` requires restarting the container; no frontend rebuild is needed.

Provide the API's database, OIDC and session credentials at **runtime**, via the settings documented in [deployment.md](deployment.md). PostgreSQL and the identity provider are external services, not bundled into these images. Migrations are embedded in the API binary; enable them according to your migration policy.

For a public origin such as `https://flags.example.com`:

- Register the OIDC callback `https://flags.example.com/auth/callback`.
- Set `GOFF_MGMT_OIDC_REDIRECTURL` to that callback and `GOFF_MGMT_AUTH_POSTLOGINREDIRECT=/`.
- Enable secure session cookies and terminate HTTPS at a trusted ingress.
- Preserve the public Host and Origin headers. nginx forwards the incoming host to the API. Do not configure the browser to call the internal API hostname.
- Use production identity-provider credentials, not the development Keycloak realm defaults.

The Relay Proxy is **not included**. These are Studio control-plane images, not application-facing evaluation infrastructure. Use an upstream GO Feature Flag Relay Proxy image separately after verifying the configuration delivery integration.
