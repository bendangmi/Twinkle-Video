# Twinkle Video

[English](README.md) | [简体中文](README_ZH_CN.md)

Twinkle Video is a customized distribution of VOZEB PRO for AI-assisted multimodal creation. It combines a unified creation agent, canvas workflows, short-drama production, asset and publication management, persistent generation workers, model routing, and commercial-operation tooling in a Next.js full-stack application.

## Shared Product Design

All UI/UX, homepage, responsive, and light/dark theme work follows the shared [Anthropic-inspired product design skill](../.agents/skills/anthropic-product-design/SKILL.md). Reuse the established theme tokens and components so Twinkle Video remains consistent with the participating Twinkle products.

> [!IMPORTANT]
> This repository is an independent community fork of [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO). It is not an official VOZEB PRO release and is not endorsed by the upstream maintainer. Fork-specific issues belong in the [Twinkle Video repository](https://github.com/bendangmi/Twinkle-Video/issues).

## Release Baseline

| Item | Value |
| --- | --- |
| Current source metadata | `v0.0.7.custom.2` |
| Maintained branch | `main` |
| Fork repository | `https://github.com/bendangmi/Twinkle-Video.git` |
| Upstream repository | `https://github.com/csyqlz/VOZEB-PRO` |
| Upstream remote name | `official` |
| Community license | GNU AGPL v3.0 |

The value above follows the checked-in `VERSION`, `web/package.json`, compose files, and deployment bundle. Update all version-bearing files together for a release.

## Fork-Specific Changes

This fork currently maintains:

- Twinkle Model account binding and logical-model routing integration.
- Isolation of personal Twinkle credentials from shared system-channel configuration.
- Twinkle-specific image/video provider behavior and video workflow extensions.
- EasyPay integration and related checkout, webhook, status, refund, and verification handling.
- Payment and Twinkle-channel stability fixes.
- External PostgreSQL deployment documentation and a dedicated two-service app/worker compose bundle.
- Hardened local Docker image packaging and release artifacts.

Most creative workspaces, administration features, protocol infrastructure, and legal materials originate from VOZEB PRO. Preserve that distinction in release notes and public descriptions.

## Core Capabilities

- **Unified creation agent:** text, image, video, and audio creation in one conversation, with reference media, skills, planning, model selection, and retry/history workflows.
- **Canvas:** text and media nodes, generation nodes, linking, transforms, import/export, and agent runs.
- **Short-drama production:** scripts, moderation, characters, scenes, props, storyboards, shots, voice, subtitles, versions, and FFmpeg composition.
- **Publication and assets:** drafts, reviews, sharing, public works, creator pages, reusable assets, and moderation.
- **Models and protocols:** channels, provider protocols, real and logical models, capability profiles, priorities, defaults, and custom protocol definitions.
- **Persistent generation:** a separate worker resumes durable image, video, audio, and agent tasks instead of depending on an open browser page.
- **Operations:** users, plans, points, promotions, coupons, invitations, CDKs, orders, payments, refunds, reconciliation, announcements, prompts, and audit logs.
- **Storage:** local media, S3-compatible storage, reference protection, migration, and redacted business-data backup/restore.

The configured provider, payment, moderation, and storage integrations determine which features are actually available. This repository does not include model quotas, payment accounts, cloud storage, or a service-level guarantee.

## Architecture

```text
Browser
  └── Next.js 16 full-stack application (web/)
        ├── App Router pages and /api route handlers
        ├── PostgreSQL business data
        ├── Local or S3-compatible media storage
        ├── Model and payment provider integrations
        └── Separate persistent generation worker
```

Main technologies include Node.js 22, Next.js 16, React, TypeScript, PostgreSQL 16, pnpm, Vitest, Playwright, FFmpeg, and Docker Compose.

## Repository Layout

```text
.
├── web/                          Full-stack application and tests
├── deploy/                       External-database deployment bundle
├── docs/                         Documentation site and operational guides
├── scripts/                      Release and third-party license tooling
├── docker-compose*.yml           Deployment profiles
├── LOCAL_DEVELOPMENT.md          Local development guide
├── THIRD_PARTY_LICENSES.md       Generated third-party notices
├── LEGAL_NOTICE.md               Upstream legal/compliance notice
├── COMMERCIAL_LICENSE*.md        Upstream commercial-license materials
└── AGENTS.md                     Fork-maintenance constraints
```

## Local Development

### Requirements

- Node.js 22
- pnpm 10 or newer; the workspace currently declares pnpm `11.9.0`
- PostgreSQL 16
- FFmpeg for local transcoding and drama composition features

Install dependencies:

```bash
pnpm --dir web install --frozen-lockfile
```

Prepare local configuration:

```bash
cp .env.example web/.env.local
```

Set a local PostgreSQL `DATABASE_URL` and generate unique values for every secret or token. Never commit `web/.env.local`.

Start the full stack and development worker on one port:

```bash
pnpm --dir web dev
```

The default URL is <http://localhost:3000>; first-time setup is under `/install`. Separate frontend/backend development commands are also available:

```bash
pnpm --dir web dev:frontend
pnpm --dir web dev:backend
```

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for port overrides and the current platform-specific workflow. Treat machine-specific paths in historical notes as examples, not portable commands.

## Docker Deployment

Two main deployment paths are checked in:

- Root `docker-compose.yml`: application, generation worker, and bundled PostgreSQL; bound to `127.0.0.1:46511` by default.
- `deploy/docker-compose.yaml`: application and generation worker using an existing external PostgreSQL database; bound to `127.0.0.1:3000` by default.

Prepare configuration from the template and generate separate strong values for database password, encryption key, installation token, maintenance token, and worker token:

```bash
cp .env.example .env
openssl rand -hex 32
docker compose config --quiet
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:46511/api/health/live
```

Use [deploy/README.md](deploy/README.md) for the external-database image import, checksum, Nginx, update, and rollback workflow.

> [!WARNING]
> The repository's internal maintenance rules identify Docker static-resource paths as an open verification item. Do not claim production readiness based only on a successful container start. Validate static assets, uploads, generated media, worker recovery, backups, restore, HTTPS, proxy streaming, database migrations, and every enabled model/payment provider in the target environment.

## Quality Checks

Run checks from the repository root:

```bash
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web format:check
pnpm --dir web check:release
npm run licenses:check
```

Run Playwright when user-visible workflows change:

```bash
pnpm --dir web e2e
```

Protocol tests should use the repository's local fixtures by default and must not consume real configured provider credentials unless explicitly approved.

## Security and Operations

- Never commit `.env`, API keys, provider credentials, payment secrets, database dumps, media, user exports, or private logs.
- Keep the application port private and terminate HTTPS at a hardened reverse proxy.
- Preserve `VOZEB_PRO_ENCRYPTION_KEY`; encrypted records may become unrecoverable if it is lost or changed without migration.
- Use different values for installation, maintenance, worker, payment-webhook, and encryption secrets.
- Back up PostgreSQL and media storage consistently, then perform restore drills.
- Keep outbound-request protections enabled; private upstream access should use explicit allowlists rather than disabling SSRF controls globally.
- Review payment and generation idempotency before enabling paid public service.

## Upstream Synchronization

Expected remotes:

```text
origin    https://github.com/bendangmi/Twinkle-Video.git
official  https://github.com/csyqlz/VOZEB-PRO
```

Fetch upstream on a dedicated synchronization branch:

```bash
git status --short
git fetch official --tags
git switch -c sync/official-YYYYMMDD
git merge official/main
```

Preserve fork-specific database contracts, authorization, payment verification, model routing, durable-task identity, and deployment behavior while resolving conflicts. Never push to `official`, force-push over published history, or replace current upstream files wholesale with older fork copies. Run the full quality gate after every synchronization.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before changing code. Use focused Conventional Commits, add regression coverage, document deployment and migration impact, regenerate third-party notices when dependencies change, and include screenshots or recordings for UI changes.

Security reports should follow [SECURITY.md](SECURITY.md) rather than public issues.

## Copyright, Attribution, and Licensing

Twinkle Video is derived from [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO). Upstream source, documentation, and history remain attributable to the upstream project and contributors. Fork modifications are attributable to their respective contributors.

The community source in this repository is distributed under the [GNU Affero General Public License v3.0](LICENSE). Modified network deployments must comply with the AGPL's corresponding-source requirements, including section 13 where applicable. Preserve copyright, license, attribution, legal notice, and modification history. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for bundled dependency notices.

The checked-in [commercial license description](COMMERCIAL_LICENSE.md) and [agreement template](COMMERCIAL_LICENSE_AGREEMENT.md) originate from the upstream VOZEB PRO project. They do not automatically prove that a recipient has a signed license, do not automatically grant rights to independently copyrighted fork modifications, and must not be presented as a Twinkle-issued commercial authorization. Anyone seeking closed-source rights should obtain written authorization covering all relevant copyright holders and versions.

“Twinkle Video,” “VOZEB PRO,” related logos, hosted services, and provider relationships may be governed separately from source copyright. The AGPL does not grant trademark rights or imply endorsement. This section is informational and is not legal advice.
