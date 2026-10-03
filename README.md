# Twinkle Video

[English](README.md) | [简体中文](README_ZH_CN.md)

Twinkle Video is a customized distribution of VOZEB PRO for AI-assisted multimodal creation. It combines a creation agent, node canvas, short-drama production, reusable assets, publication workflows, persistent generation workers, model routing, and commercial-operation tooling in a Next.js full-stack application.

> [!IMPORTANT]
> This repository is an independent community fork of [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO). It is not an official VOZEB PRO release and is not endorsed by the upstream maintainer. Report fork-specific issues to [bendangmi/Twinkle-Video](https://github.com/bendangmi/Twinkle-Video/issues).

## Release Baseline

| Item | Current value |
| --- | --- |
| Source metadata | `v0.0.7.custom.4` |
| Maintained branch | `main` |
| Fork repository | `https://github.com/bendangmi/Twinkle-Video.git` |
| Upstream repository | `https://github.com/csyqlz/VOZEB-PRO` |
| Upstream remote name | `official` |
| Package manager | `pnpm@11.9.0` |
| Source license | Business Source License 1.1 (BUSL-1.1); see [LICENSE](LICENSE) |

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

## License and Commercial Use

Twinkle Video inherits VOZEB-PRO's [Business Source License 1.1](LICENSE). Personal and non-commercial use is covered by the Additional Use Grant. Enterprise production, commercial operations, SaaS, private deployment, third-party delivery, resale, and integration into paid products require an upstream [commercial license](COMMERCIAL_LICENSE.md). See [LICENSE_NOTICE.md](LICENSE_NOTICE.md) for the change date and conversion license. This fork does not grant upstream commercial or trademark rights.

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

## Repository Reference

| 路径                                        | 文件里是什么                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `web/src/app/`                              | Next.js 页面、布局、安装页、用户工作区、管理后台和本站 API Route Handler   |
| `web/src/lib/server/`                       | Agent 编排、模型路由、生成任务、计费、媒体、对象存储、支付和服务端安全逻辑 |
| `web/src/lib/server/database/`              | PostgreSQL 表结构、参数化 Repository、查询映射和文件 Provider 回退         |
| `web/src/components/` / `web/src/hooks/`    | 跨页面 UI、创作控件、素材选择、复制下载和会话交互                          |
| `web/src/services/api/` / `web/src/stores/` | 浏览器访问本站 API 的类型化客户端，以及用户、主题、配置和素材瞬时状态      |
| `web/scripts/`                              | 低内存生产构建、standalone 启动、生成 Worker、管理员密码重置和发布检查脚本 |
| `web/public/`                               | 站点 Logo、浏览器图标和模型品牌图标                                        |
| `docs/content/docs/`                        | 功能、安装、部署、数据库、商业准备、进度和排障文档                         |
| `docs/public/screenshots/`                  | 用户端、公开页和管理后台的脱敏 WebP 功能截图                               |
| `.github/workflows/quality.yml`             | Web 与文档的安装、类型检查、测试、格式检查和生产构建                       |
| `.github/workflows/docker-image.yml`        | 主应用 amd64/arm64 镜像构建与 GHCR 多架构合并                              |
| `.github/workflows/docs-docker-image.yml`   | 文档站 amd64/arm64 镜像构建与 GHCR 多架构合并                              |
| `.env.example`                              | 数据库、站点、加密、代理、媒体、模型、支付和部署变量模板                   |
| `Dockerfile` / `docker-compose*.yml`        | standalone 生产镜像，以及标准、源码、宝塔、外部数据库和低内存部署拓扑      |
| `VERSION` / `CHANGELOG.md`                  | 当前版本号和版本级变更记录                                                 |
| `LICENSE` / `COMMERCIAL_LICENSE.md`         | BUSL-1.1 源码公开许可，以及 VOZEB PRO 商业授权说明                         |
| `COMMERCIAL_LICENSE_AGREEMENT.md`           | 商业授权协议参考模板；只有双方完成信息并签署后才产生合同效力               |
| `DISCLAIMER.md` / `LEGAL_NOTICE.md`         | 软件与 AI 内容免责声明，以及公开授权和合规警示                             |
| `CLA.md` / `SECURITY.md`                    | 贡献者授权和漏洞提交规则                                                   |
| `AGENTS.md` / `CONTRIBUTING.md`             | 项目工程约束，以及开发者提交 Issue、代码和文档的流程                       |

更完整的目录树、关键源码入口、Service、Route Handler、Repository 和任务 Store 职责见[项目结构与流程](docs/content/docs/overview/project-structure.mdx)。

## 页面展示

<table>
  <tr>
    <td width="50%"><img src="docs/public/screenshots/pages/02-create.webp" alt="统一创作 Agent"></td>
    <td width="50%"><img src="docs/public/screenshots/pages/03a-canvas-editor.webp" alt="Canvas 编辑器"></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/public/screenshots/pages/04a-drama-editor.webp" alt="短剧生产编辑器"></td>
    <td width="50%"><img src="docs/public/screenshots/pages/20-admin-overview.webp" alt="经营看板"></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/public/screenshots/pages/34-admin-channels.webp" alt="模型渠道"></td>
    <td width="50%"><img src="docs/public/screenshots/pages/07-prompts.webp" alt="提示词库"></td>
  </tr>
</table>

用户端、公开页和管理后台共 40 张功能截图见[页面功能图册](docs/content/docs/overview/page-gallery.mdx)。

## 数据与安全

- PostgreSQL 保存用户、会话、设置、创作会话、Canvas、素材、短剧、生成任务、积分和订单。
- 外部存储关闭时新媒体只写 `VOZEB_PRO_DATA_DIR`；开启时新媒体只写 S3 兼容对象存储。历史媒体按登记 Provider 读取。
- 业务记录保存稳定站内 `storageKey`，不保存 base64、对象 Key 或临时签名 URL。
- `.env`、API Key、支付密钥、数据库、媒体文件、备份、日志和构建产物不得提交 Git。
- 生产备份必须同时覆盖 PostgreSQL 和本地媒体或对象存储，不能只备份其中一部分。

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

## Further Reading

- [功能总览](docs/content/docs/overview/features.mdx)
- [目录与文件用途](docs/content/docs/overview/project-structure.mdx)
- [配置说明](docs/content/docs/overview/configuration.mdx)
- [数据库结构](docs/content/docs/backend/backend-database.mdx)
- [待测试](docs/content/docs/progress/pending-test.mdx)
- [参与贡献](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [Business Source License 1.1](LICENSE)
- [商业授权说明](COMMERCIAL_LICENSE.md)
- [许可证说明](LICENSE_NOTICE.md)
- [商业授权协议模板](COMMERCIAL_LICENSE_AGREEMENT.md)
- [免责声明](DISCLAIMER.md)
- [授权与合规警示](LEGAL_NOTICE.md)
- [贡献者协议](CLA.md)

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

The source in this repository inherits upstream's [Business Source License 1.1](LICENSE). Commercial use requires an upstream authorization; the change date and conversion license are listed in [LICENSE_NOTICE.md](LICENSE_NOTICE.md). Preserve applicable copyright, license, attribution, legal, and modification notices. Bundled dependency notices are listed in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

The checked-in [commercial license description](COMMERCIAL_LICENSE.md) and [agreement template](COMMERCIAL_LICENSE_AGREEMENT.md) originate from upstream VOZEB PRO. They do not prove that a recipient has a signed license, do not automatically grant closed-source rights to independently copyrighted fork changes, and must not be presented as a Twinkle-issued authorization. Closed-source licensing requires written permission covering the relevant version and every necessary rights holder.

“Twinkle Video,” “VOZEB PRO,” related logos, hosted services, model/provider access, payment accounts, and commercial relationships are separate from source copyright. The source license grants no trademark rights and does not imply endorsement. This section is informational and is not legal advice.
