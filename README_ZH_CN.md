# Twinkle Video

[English](README.md) | [简体中文](README_ZH_CN.md)

Twinkle Video 是基于 VOZEB PRO 定制的 AI 多模态创作平台，以 Next.js 全栈应用整合创作 Agent、节点画布、短剧生产、复用素材、作品发布、持久生成 Worker、模型路由和商业运营工具。

> [!IMPORTANT]
> 本仓库是 [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO) 的独立社区二开，不是 VOZEB PRO 官方版本，也不代表获得上游维护者认可。二开特有问题请提交到 [bendangmi/Twinkle-Video](https://github.com/bendangmi/Twinkle-Video/issues)。

## 版本基线

| 项目 | 当前值 |
| --- | --- |
| 源码版本元数据 | `v0.0.7.custom.3` |
| 维护分支 | `main` |
| 二开仓库 | `https://github.com/bendangmi/Twinkle-Video.git` |
| 上游仓库 | `https://github.com/csyqlz/VOZEB-PRO` |
| 上游远程名 | `official` |
| 包管理器 | `pnpm@11.9.0` |
| 社区源码许可证 | GNU AGPL v3.0 |

版本信息分布在 `VERSION`、根目录与 `web/` 包元数据、Compose 和部署资源中。发布时必须同步更新全部版本文件，并核验镜像摘要与内嵌元数据。

## 二开边界

### Twinkle 维护的改动

- Twinkle Model 账户绑定与逻辑模型路由。
- 个人 Twinkle 凭据与共享系统渠道配置隔离。
- Twinkle 专用图片/视频供应商行为与工作流扩展。
- EasyPay 下单、回调、状态、退款和验签集成。
- 支付与 Twinkle 渠道稳定性修复。
- 外部 PostgreSQL 部署文档与独立应用/Worker 组合。
- 加固的本地镜像打包与版本化发布产物。

### 继承自 VOZEB PRO 的能力

- 统一文本、图片、视频和音频创作 Agent，支持参考素材、Skill、规划、模型选择、重试与历史。
- 画布节点、连线、变换、导入导出、生成操作与 Agent 运行。
- 短剧脚本、审核、角色、场景、道具、分镜、镜头、配音、字幕、版本与 FFmpeg 合成。
- 草稿、审核、分享、公开作品、创作者主页、复用素材与内容治理。
- 渠道、供应商协议、真实/逻辑模型、能力配置、优先级和自定义协议。
- 用户、套餐、积分、促销、优惠券、邀请、CDK、订单、支付、退款、对账、公告、提示词与审计日志。

大部分创作、管理、协议和法律材料来源于上游。公共描述与发布说明必须区分上游能力和二开贡献。

## 系统架构

```text
浏览器
  └── Next.js 16 全栈应用（web/）
        ├── App Router 页面与 /api Route Handler
        ├── PostgreSQL 业务数据
        ├── 本地或 S3 兼容媒体存储
        ├── 模型、审核、存储与支付集成
        └── 独立持久生成 Worker
```

生成 Worker 不依赖浏览器页面持续打开，可处理持久化的图片、视频、音频和 Agent 任务。生产部署必须让 Worker 与应用共享同一数据库、加密、存储和模型配置，并监控其心跳。

主要技术包括 Node.js 22、Next.js 16、React、TypeScript、PostgreSQL 16、pnpm、Vitest、Playwright、FFmpeg 与 Docker Compose。

## 目录结构

```text
.
├── web/                          全栈应用、Worker 与测试
├── deploy/                       外部数据库部署组合
├── docs/                         文档站与运维指南
├── scripts/                      发布和第三方许可证工具
├── docker-compose*.yml           部署组合
├── LOCAL_DEVELOPMENT.md          本地开发指南
├── CONTRIBUTING.md               贡献流程
├── SECURITY.md                   漏洞报告政策
├── THIRD_PARTY_LICENSES.md       生成的依赖声明
├── LEGAL_NOTICE.md               上游法律/合规声明
├── COMMERCIAL_LICENSE*.md        上游商业授权材料
└── VERSION                       当前源码版本元数据
```

不要提交 `.env`、数据库、媒体、用户导出、备份、日志、`.next/`、Playwright 输出、生成包或 Docker 镜像归档。

## 快速开始

### 环境要求

- Node.js 22
- pnpm 10 或更高版本；仓库声明 `pnpm@11.9.0`
- PostgreSQL 16
- 短剧合成与本地转码所需的 FFmpeg

准备开发环境：

```bash
cp .env.example web/.env.local
pnpm --dir web install --frozen-lockfile
pnpm --dir web dev
```

PowerShell 可执行 `Copy-Item .env.example web/.env.local`。

访问 <http://127.0.0.1:3000>，首次安装入口为 `/install`。开发脚本会启动全栈应用与生成 Worker。前后端分端口模式见 [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)。

至少要配置私有 PostgreSQL 数据库，并逐项检查 `web/.env.local` 中的密钥。禁止复用示例数据库密码、安装令牌、维护令牌、Worker 令牌或加密密钥。

## 数据与服务边界

运营者必须统一规划：

- PostgreSQL 中的业务、身份、计费与持久任务数据；
- 本地或 S3 兼容存储中的原始与生成媒体；
- `VOZEB_PRO_ENCRYPTION_KEY` 以及恢复受保护记录所需的其他密钥；
- Worker 配置与心跳监控；
- 模型、审核、存储、邮件、OAuth 与支付供应商凭据。

媒体不在 PostgreSQL 中时，仅备份数据库是不完整的。数据库与媒体应在一致恢复点备份，加密密钥单独保存，并在升级前实际演练恢复。

Twinkle Model 与支付集成会引入独立运营者和法律关系。不要假设各方共享隐私、计费、争议处理、可用性或服务等级条款。应使用相互独立的低权限凭据，并在接受真实交易前验证回调签名以及任务/支付幂等性。

## Docker 部署

仓库提供两种主要组合：

| 组合 | 服务 | 默认绑定 |
| --- | --- | --- |
| `docker-compose.yml` | PostgreSQL、应用与生成 Worker | `127.0.0.1:46511` |
| `deploy/docker-compose.yaml` | 使用外部 PostgreSQL 的应用与 Worker | `127.0.0.1:46511` |

准备生产值并检查解析后的配置：

```bash
cp .env.example .env
# 为每个 Secret 生成相互独立的高强度随机值。
docker compose config --quiet
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:46511/api/health/live
```

将 `VOZEB_PRO_IMAGE` 设置为自行构建或独立核验的不可变镜像标签/摘要。默认仓库路径或标签不能证明镜像包含当前二开提交。

> [!WARNING]
> 容器正在运行不代表生产可用。必须在目标环境验证静态资源、上传、媒体生成、Worker 恢复、数据库迁移、备份恢复、HTTPS、流式代理以及每个启用的模型或支付供应商。

应用应位于持续维护的 HTTPS 反向代理后，PostgreSQL 只能对私有网络开放。外部数据库流程与回滚说明见 [deploy/README.md](deploy/README.md)。

## 质量检查

在仓库根目录运行：

```bash
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web format:check
pnpm --dir web check:release
pnpm licenses:check
```

用户可见流程变化还应运行浏览器回归：

```bash
pnpm --dir web e2e
```

协议测试默认使用仓库本地 fixture。只有在明确授权并了解费用与数据范围后，才可使用已配置的生产供应商凭据进行真实测试。

## 安全与运维

- 禁止提交 API Key、供应商凭据、支付密钥、数据库、媒体、用户导出、备份或私有日志。
- 必须保留 `VOZEB_PRO_ENCRYPTION_KEY`；替换或丢失后可能无法恢复受保护记录。
- 安装、维护、Worker、支付回调、会话和加密密钥必须使用不同值。
- 保持出站请求防护；访问私网上游时应使用精确白名单，不能全局关闭 SSRF 控制。
- 应用只绑定私有接口并位于 HTTPS 后，同时监控 Worker、数据库、存储、队列和支付回调。
- 漏洞按 [SECURITY.md](SECURITY.md) 私密报告。

## 同步上游

预期远程配置：

```text
origin    https://github.com/bendangmi/Twinkle-Video.git
official  https://github.com/csyqlz/VOZEB-PRO
```

本工作区已禁用 `official` 的推送地址。在独立分支获取并合并上游：

```bash
git status --short
git fetch official --tags
git switch -c sync/official-YYYYMMDD
git merge official/main
```

必须保留二开数据库契约、鉴权、支付验签、模型路由、持久任务身份与部署行为。禁止向 `official` 推送、强制覆盖已发布历史或用旧二开文件整份替换上游新文件。每次同步后运行完整质量门禁。

## 参与贡献

修改代码前阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [AGENTS.md](AGENTS.md)。使用聚焦的 Conventional Commits，补充回归测试，说明迁移和部署影响；依赖变化后重新生成第三方声明，可见 UI 变化提供截图或录屏。前端 UI 开发遵循共享的[产品设计规范](../.agents/skills/anthropic-product-design/SKILL.md)。

## 署名与许可证

Twinkle Video 派生自 [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO)。上游源码、文档和历史贡献继续归属上游项目及其贡献者，二开修改归各自贡献者。

本仓库社区源码按 [GNU Affero General Public License v3.0](LICENSE) 分发。修改后的网络部署可能需要根据 AGPL 第 13 条提供完整对应源码。再分发时必须保留适用的版权、许可证、署名、法律与修改声明。捆绑依赖声明见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

仓库中的[商业授权说明](COMMERCIAL_LICENSE.md)与[协议模板](COMMERCIAL_LICENSE_AGREEMENT.md)来源于 VOZEB PRO 上游。它们不能证明接收者已获得签署授权，不会自动授予独立二开贡献的闭源权利，也不能作为 Twinkle 已签发授权对外宣传。闭源授权必须取得覆盖相关版本与全部必要权利人的书面许可。

“Twinkle Video”“VOZEB PRO”、相关 Logo、托管服务、模型/供应商访问、支付账户与商业关系独立于源码版权。AGPL 不授予商标权，也不代表官方认可。本节仅用于信息说明，不构成法律意见。
