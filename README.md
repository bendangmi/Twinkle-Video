# Twinkle Video

[English](README.md) | [简体中文](README_ZH_CN.md)

Twinkle Video is a customized distribution of VOZEB PRO for AI-assisted multimodal creation. It combines a creation agent, node canvas, short-drama production, reusable assets, publication workflows, persistent generation workers, model routing, and commercial-operation tooling in a Next.js full-stack application.

> [!IMPORTANT]
> This repository is an independent community fork of [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO). It is not an official VOZEB PRO release and is not endorsed by the upstream maintainer. Report fork-specific issues to [bendangmi/Twinkle-Video](https://github.com/bendangmi/Twinkle-Video/issues).

## Release Baseline

| Item | Current value |
| --- | --- |
| Source metadata | `v0.0.7.custom.3` |
| Maintained branch | `main` |
| Fork repository | `https://github.com/bendangmi/Twinkle-Video.git` |
| Upstream repository | `https://github.com/csyqlz/VOZEB-PRO` |
| Upstream remote name | `official` |
| Package manager | `pnpm@11.9.0` |
| Community source license | GNU AGPL v3.0 |

The version appears in `VERSION`, root and `web/` package metadata, compose files, and deployment resources. Update every version-bearing file together and verify the resulting image digest and embedded metadata.

## Fork Scope

### Twinkle-maintained changes

- Twinkle Model account binding and logical-model routing.
- Isolation of personal Twinkle credentials from shared system-channel configuration.
- Twinkle-specific image and video provider behavior and workflow extensions.
- EasyPay checkout, webhook, status, refund, and verification integration.
- Payment and Twinkle-channel stability fixes.
- External PostgreSQL deployment documentation and a separate app/worker profile.
- Hardened local image packaging and versioned release artifacts.

### Inherited VOZEB PRO capabilities

- Unified text, image, video, and audio creation agent with references, skills, planning, model selection, retry, and history.
- Canvas nodes, links, transforms, import/export, generation actions, and agent runs.
- Short-drama scripts, moderation, characters, scenes, props, storyboards, shots, voice, subtitles, versions, and FFmpeg composition.
- Drafts, reviews, sharing, public works, creator pages, reusable assets, and moderation.
- Channels, provider protocols, real and logical models, capability profiles, priorities, and custom protocol definitions.
- Users, plans, points, promotions, coupons, invitations, CDKs, orders, payments, refunds, reconciliation, announcements, prompts, and audit logs.

Most creative, administration, protocol, and legal materials originate upstream. Keep upstream and fork contributions distinguishable in public descriptions and release notes.

## Architecture

```text
Browser
  └── Next.js 16 full-stack application (web/)
        ├── App Router pages and /api route handlers
        ├── PostgreSQL business data
        ├── local or S3-compatible media storage
        ├── model, moderation, storage, and payment integrations
        └── separate persistent generation worker
```

The generation worker processes durable image, video, audio, and agent tasks independently of an open browser session. Production deployments must run the worker with the same database, encryption, storage, and model configuration as the application and monitor its heartbeat.

Main technologies include Node.js 22, Next.js 16, React, TypeScript, PostgreSQL 16, pnpm, Vitest, Playwright, FFmpeg, and Docker Compose.

## Repository Layout

```text
.
├── web/                          Full-stack application, worker, and tests
├── deploy/                       External-database deployment profile
├── docs/                         Documentation website and operations guides
├── scripts/                      Release and third-party-license tooling
├── docker-compose*.yml           Deployment profiles
├── LOCAL_DEVELOPMENT.md          Local development guide
├── CONTRIBUTING.md               Contribution workflow
├── SECURITY.md                   Vulnerability reporting policy
├── THIRD_PARTY_LICENSES.md       Generated dependency notices
├── LEGAL_NOTICE.md               Upstream legal/compliance notice
├── COMMERCIAL_LICENSE*.md        Upstream commercial-license materials
└── VERSION                       Current source metadata
```

Do not commit `.env`, databases, media, user exports, backups, logs, `.next/`, Playwright output, generated bundles, or Docker image archives.

## Quick Start

### Requirements

- Node.js 22
- pnpm 10 or later; the repository declares `pnpm@11.9.0`
- PostgreSQL 16
- FFmpeg for short-drama composition and local transcoding workflows

Prepare the development environment:

```bash
cp .env.example web/.env.local
pnpm --dir web install --frozen-lockfile
pnpm --dir web dev
```

PowerShell users can run `Copy-Item .env.example web/.env.local`.

Open <http://127.0.0.1:3000>; first-time setup is available at `/install`. The development runner starts the full-stack application and generation worker. Alternative frontend/backend port modes are documented in [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

At minimum, configure a private PostgreSQL database and review every secret in `web/.env.local`. Do not reuse the sample database password, installation token, maintenance token, worker token, or encryption key.

## Data and Service Boundaries

Operators must plan for all of the following:

- PostgreSQL business, identity, billing, and durable task data.
- Local or S3-compatible original and generated media.
- `VOZEB_PRO_ENCRYPTION_KEY` and other secrets required to decrypt protected records.
- Worker configuration and heartbeat monitoring.
- Model, moderation, storage, email, OAuth, and payment-provider credentials.

Database-only backups are incomplete when media is stored outside PostgreSQL. Back up database and media at a consistent recovery point, store encryption keys separately, and test restoration before upgrades.

Twinkle Model and payment integrations introduce separate operators and legal relationships. Do not assume shared privacy, billing, dispute, availability, or service-level terms. Use distinct low-privilege credentials and verify webhook signatures and task/payment idempotency before accepting real transactions.

## Docker Deployment

The repository provides two primary profiles:

| Profile | Services | Default bind |
| --- | --- | --- |
| `docker-compose.yml` | PostgreSQL, app, and generation worker | `127.0.0.1:46511` |
| `deploy/docker-compose.yaml` | App and worker using external PostgreSQL | `127.0.0.1:46511` |

Prepare production values and inspect the resolved configuration:

```bash
cp .env.example .env
# Generate independent high-entropy values for every secret.
docker compose config --quiet
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:46511/api/health/live
```

Set `VOZEB_PRO_IMAGE` to an immutable image tag or digest that you built or independently verified. A default registry path or tag is not proof that an image contains the current fork commit.

> [!WARNING]
> A running container is not evidence of production readiness. Validate static assets, uploads, media generation, worker recovery, database migration, backup/restore, HTTPS, streaming proxy behavior, and every enabled model or payment provider in the target environment.

Put the application behind a maintained HTTPS reverse proxy and keep PostgreSQL private. Review [deploy/README.md](deploy/README.md) for the external-database workflow and rollback notes.

## Quality Checks

Run from the repository root:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web format:check
pnpm --dir web check:release
pnpm licenses:check
```

Run browser regression for user-visible flow changes:

```bash
pnpm --dir web e2e
```

Protocol tests should use repository-local fixtures by default. Do not consume configured production provider credentials unless a live test is explicitly authorized and its cost and data scope are understood.

## Security and Operations

- Never commit API keys, provider credentials, payment secrets, databases, media, user exports, backups, or private logs.
- Preserve `VOZEB_PRO_ENCRYPTION_KEY`; replacing or losing it can make protected records unrecoverable.
- Use different values for installation, maintenance, worker, payment callback, session, and encryption secrets.
- Keep outbound request protection enabled; allow private upstreams through precise allowlists rather than disabling SSRF controls globally.
- Restrict the application to a private interface behind HTTPS and monitor the worker, database, storage, queues, and payment webhooks.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Upstream Synchronization

Expected remotes:

```text
origin    https://github.com/bendangmi/Twinkle-Video.git
official  https://github.com/csyqlz/VOZEB-PRO
```

The `official` push URL is intentionally disabled in this workspace. Fetch upstream changes and merge on a dedicated branch:

```bash
git status --short
git fetch official --tags
git switch -c sync/official-YYYYMMDD
git merge official/main
```

Preserve fork database contracts, authorization, payment verification, model routing, durable task identity, and deployment behavior. Never push to `official`, force-overwrite published history, or replace new upstream files wholesale with old fork copies. Run the complete quality gate after every sync.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before changing code. Use focused Conventional Commits, add regression tests, document migration and deployment impact, regenerate third-party notices after dependency changes, and provide screenshots or recordings for visible UI changes. Frontend UI work follows the shared [product design guidance](../.agents/skills/anthropic-product-design/SKILL.md).

## Attribution and Licensing

Twinkle Video is derived from [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO). Upstream source, documentation, and history remain attributable to the upstream project and its contributors; fork changes remain attributable to their contributors.

The community source in this repository is distributed under the [GNU Affero General Public License v3.0](LICENSE). Modified network deployments may be required to offer complete corresponding source under AGPL section 13. Preserve applicable copyright, license, attribution, legal, and modification notices. Bundled dependency notices are listed in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

The checked-in [commercial license description](COMMERCIAL_LICENSE.md) and [agreement template](COMMERCIAL_LICENSE_AGREEMENT.md) originate from upstream VOZEB PRO. They do not prove that a recipient has a signed license, do not automatically grant closed-source rights to independently copyrighted fork changes, and must not be presented as a Twinkle-issued authorization. Closed-source licensing requires written permission covering the relevant version and every necessary rights holder.

“Twinkle Video,” “VOZEB PRO,” related logos, hosted services, model/provider access, payment accounts, and commercial relationships are separate from source copyright. The AGPL grants no trademark rights and does not imply endorsement. This section is informational and is not legal advice.
