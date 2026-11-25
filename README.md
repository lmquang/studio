# GO Feature Flag Studio

<p align="center">
    <img src="https://img.shields.io/badge/status-work%20in%20progress-orange" alt="Status: Work in progress" />
    <a href="https://codecov.io/gh/go-feature-flag/studio"><img src="https://codecov.io/gh/go-feature-flag/studio/branch/main/graph/badge.svg" alt="codecov" /></a>
    <a href="https://gofeatureflag.org/slack"><img src="https://img.shields.io/badge/join-us%20on%20slack-gray.svg?longCache=true&logo=slack&colorB=green" alt="Join us on slack"></a>
    <a href="https://github.com/sponsors/thomaspoignant"><img src="https://img.shields.io/github/sponsors/thomaspoignant?logo=GitHub%20Sponsors" alt="Sponsors"></a>
    <a href="https://github.com/thomaspoignant/go-feature-flag/blob/main/LICENSE"><img src="https://img.shields.io/github/license/thomaspoignant/go-feature-flag" alt="License"/></a>
</p>

> 🚧 **We are currently building this.** The Studio is under active development:
> features, APIs and the data model can change at any time, and it is not ready
> for production use yet. Feedback and contributions are welcome!

## What is it?

GO Feature Flag Studio is the web interface for
[GO Feature Flag](https://gofeatureflag.org), the open-source feature flag
solution built on [OpenFeature](https://openfeature.dev).

GO Feature Flag already lets you evaluate flags from a file through the relay
proxy and the OpenFeature SDKs. The Studio adds the place where humans manage
those flags: create and edit them in a UI, organize them by team, control who
can change what, and keep a history of every change.

## Requirements

- **PostgreSQL 18 or later.** The schema uses `uuidv7()` and virtual generated
  columns, both new in PostgreSQL 18; the server refuses to start on an older
  version. It applies its migrations at startup (set `GOFF_MGMT_DB_MIGRATE=false`
  to run them yourself).

See the [deployment guide](docs/deployment.md) for configuration, reverse proxies and cookies.

## Run locally

```sh
# Requires Node.js, Go and a running Docker-compatible engine (Docker / Kiri).
# One-time hostname setup:
echo '127.0.0.1 goff.local' | sudo tee -a /etc/hosts
make dev
```

Open **http://goff.local:5173** and sign in with the development account
`admin@local` / `admin`. The UI and API start together with Postgres 18 and Keycloak.
See the [Web UI guide](webui/README.md) for flag management, roles, commands,
production hosting and the current feature scope.

## Container images

CI builds API and Web UI images for pull requests and publishes them to GHCR on
`main` updates and `v*` tags:

- `ghcr.io/lmquang/studio-api`
- `ghcr.io/lmquang/studio-webui`

See [Container images and GHCR](docs/containers.md) for tags, permissions,
local builds and runtime configuration.

## License

MIT
