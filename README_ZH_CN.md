# Twinkle Video

[English](README.md) | [简体中文](README_ZH_CN.md)

Twinkle Video 是基于 VOZEB PRO 二次开发的 AI 多模态创作平台，将统一创作 Agent、画布、短剧生产、素材与作品管理、持久生成 Worker、模型路由和商业运营能力整合在一个 Next.js 全栈应用中。

> [!IMPORTANT]
> 本仓库是 [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO) 的独立社区二开，不是 VOZEB PRO 官方版本，也不代表获得上游维护者认可。二开特有问题请提交到 [Twinkle Video 仓库](https://github.com/bendangmi/Twinkle-Video/issues)。

## 版本基线

| 项目 | 当前值 |
| --- | --- |
| 当前源码元数据 | `v0.0.7.custom.2` |
| 维护分支 | `main` |
| 二开仓库 | `https://github.com/bendangmi/Twinkle-Video.git` |
| 上游仓库 | `https://github.com/csyqlz/VOZEB-PRO` |
| 上游远程名称 | `official` |
| 社区许可证 | GNU AGPL v3.0 |

上述版本来自当前 `VERSION`、`web/package.json`、Compose 和部署文件；正式发布时必须同步更新所有版本载体。

## 二开内容

本仓库目前维护以下定制：

- Twinkle Model 账户绑定与逻辑模型路由。
- 将用户个人 Twinkle 凭据与共享系统渠道配置隔离。
- Twinkle 图片/视频供应商行为与视频工作流扩展。
- EasyPay 接入，以及结算、回调、状态、退款和验签处理。
- 支付流程与 Twinkle 渠道稳定性修复。
- 外部 PostgreSQL 部署文档，以及仅包含应用和 Worker 的 Compose 组合。
- 加固的本地 Docker 镜像打包与发布产物。

大部分创作工作区、管理能力、协议基础设施和法律材料来源于 VOZEB PRO，发布说明与公开介绍必须保留这一区分。

## 核心能力

- **统一创作 Agent**：在同一会话完成文本、图片、视频和音频创作，支持参考素材、Skill、规划、模型选择、失败重试与历史恢复。
- **画布**：文本与媒体节点、生成节点、连线、变换、导入导出和 Agent Run。
- **短剧生产**：剧本、审核、角色、场景、道具、分镜、镜头、配音、字幕、版本和 FFmpeg 合成。
- **作品与素材**：草稿、审核、分享、作品广场、作者页、素材复用和内容治理。
- **模型与协议**：渠道、供应商协议、真实/逻辑模型、能力档案、优先级、默认值与自定义协议。
- **持久生成**：独立 Worker 续取图片、视频、音频和 Agent 持久任务，不依赖浏览器页面持续打开。
- **运营后台**：用户、套餐、积分、促销、优惠券、邀请、CDK、订单、支付、退款、对账、公告、提示词与审计日志。
- **存储**：本地媒体、S3 兼容存储、引用保护、迁移与脱敏业务数据备份恢复。

实际可用能力取决于模型、支付、审核和存储配置。本仓库不附带模型额度、支付账户、云存储或服务等级保证。

## 系统架构

```text
浏览器
  └── Next.js 16 全栈应用（web/）
        ├── App Router 页面与 /api Route Handler
        ├── PostgreSQL 业务数据
        ├── 本地或 S3 兼容媒体存储
        ├── 模型与支付供应商集成
        └── 独立持久生成 Worker
```

主要技术包括 Node.js 22、Next.js 16、React、TypeScript、PostgreSQL 16、pnpm、Vitest、Playwright、FFmpeg 与 Docker Compose。

## 目录结构

```text
.
├── web/                          全栈应用与测试
├── deploy/                       外部数据库部署包
├── docs/                         文档站与运维指南
├── scripts/                      发布与第三方许可证工具
├── docker-compose*.yml           部署组合
├── LOCAL_DEVELOPMENT.md          本地开发指南
├── THIRD_PARTY_LICENSES.md       生成的第三方声明
├── LEGAL_NOTICE.md               上游法律与合规声明
├── COMMERCIAL_LICENSE*.md        上游商业授权材料
└── AGENTS.md                     二开维护约束
```

## 本地开发

### 环境要求

- Node.js 22
- pnpm 10 或更高；工作区当前声明 pnpm `11.9.0`
- PostgreSQL 16
- 本地转码和短剧合成所需的 FFmpeg

安装依赖：

```bash
pnpm --dir web install --frozen-lockfile
```

准备本地配置：

```bash
cp .env.example web/.env.local
```

设置本地 PostgreSQL `DATABASE_URL`，并为所有 Secret 和 Token 生成不同的随机值。禁止提交 `web/.env.local`。

使用单端口启动全栈应用和开发 Worker：

```bash
pnpm --dir web dev
```

默认访问 <http://localhost:3000>，首次安装入口为 `/install`。也可分别启动：

```bash
pnpm --dir web dev:frontend
pnpm --dir web dev:backend
```

端口覆盖与当前平台操作方式见 [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)。历史文档中的机器绝对路径只能视为示例，不能作为通用命令。

## Docker 部署

仓库提供两种主要方式：

- 根目录 `docker-compose.yml`：应用、生成 Worker 与内置 PostgreSQL，默认绑定 `127.0.0.1:46511`。
- `deploy/docker-compose.yaml`：应用与生成 Worker 使用现有外部 PostgreSQL，默认绑定 `127.0.0.1:3000`。

从模板准备配置，并分别生成数据库密码、加密密钥、安装令牌、维护令牌与 Worker 令牌：

```bash
cp .env.example .env
openssl rand -hex 32
docker compose config --quiet
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:46511/api/health/live
```

外部数据库镜像导入、校验、Nginx、更新和回滚流程见 [deploy/README.md](deploy/README.md)。

> [!WARNING]
> 仓库内部维护规范明确指出 Docker 静态资源路径仍属于待验证项。容器成功启动不等于生产可用；必须在目标环境验证静态资源、上传、生成媒体、Worker 恢复、备份恢复、HTTPS、代理流式传输、数据库迁移以及每个启用的模型/支付供应商。

## 质量检查

在仓库根目录执行：

```bash
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web format:check
pnpm --dir web check:release
npm run licenses:check
```

用户可见流程变化还应运行 Playwright：

```bash
pnpm --dir web e2e
```

协议测试默认使用仓库本地 fixture；除非获得明确批准，否则不得消耗已配置的真实供应商凭据。

## 安全与运维

- 禁止提交 `.env`、API Key、供应商凭据、支付密钥、数据库转储、媒体、用户导出或私有日志。
- 应用端口只对私有网络开放，由加固的反向代理终止 HTTPS。
- 必须保留 `VOZEB_PRO_ENCRYPTION_KEY`；丢失或未迁移直接更换可能导致加密记录无法恢复。
- 安装、维护、Worker、支付回调和加密密钥必须使用不同值。
- PostgreSQL 与媒体存储应一致备份，并定期执行恢复演练。
- 保持出站请求防护；访问私网上游应使用明确白名单，不能全局关闭 SSRF 控制。
- 开放付费服务前必须复核支付与生成任务幂等性。

## 同步上游

预期远程配置：

```text
origin    https://github.com/bendangmi/Twinkle-Video.git
official  https://github.com/csyqlz/VOZEB-PRO
```

在独立同步分支获取上游：

```bash
git status --short
git fetch official --tags
git switch -c sync/official-YYYYMMDD
git merge official/main
```

解决冲突时必须保留二开数据库契约、权限、支付验签、模型路由、持久任务身份和部署行为。禁止向 `official` 推送、强制覆盖已发布历史或用旧二开文件整份替换上游新文件。每次同步后运行完整质量门禁。

## 参与贡献

修改代码前阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [AGENTS.md](AGENTS.md)。使用聚焦的 Conventional Commits，补充回归测试，说明部署与迁移影响；依赖变化需重新生成第三方声明，可见 UI 变化需提供截图或录屏。

安全问题应按 [SECURITY.md](SECURITY.md) 私密报告，不要公开披露。

## 版权、署名与许可证

Twinkle Video 派生自 [VOZEB-PRO](https://github.com/csyqlz/VOZEB-PRO)。上游源码、文档和历史贡献仍归属上游项目及其贡献者，二开修改归各自贡献者。

本仓库社区源码按 [GNU Affero General Public License v3.0](LICENSE) 分发。修改后的网络部署必须遵守 AGPL 对应源码要求，包括适用时的第 13 条。再分发时应保留版权、许可证、署名、法律声明和修改历史。捆绑依赖声明见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

仓库中的[商业授权说明](COMMERCIAL_LICENSE.md)和[协议模板](COMMERCIAL_LICENSE_AGREEMENT.md)来源于 VOZEB PRO 上游。它们不能自动证明任何接收者已获得签署授权，也不会自动授予独立二开贡献的闭源权利，更不能作为 Twinkle 已签发商业授权对外宣传。需要闭源授权时，应取得覆盖相关版本及全部必要版权方的书面许可。

“Twinkle Video”“VOZEB PRO”、相关 Logo、托管服务和供应商关系可能独立于源码版权。AGPL 不授予商标权，也不代表任何官方认可。本节仅用于信息说明，不构成法律意见。

## 共享产品设计规范

所有 UI/UX、首页、响应式与浅色/深色主题开发均遵循共享的 [Anthropic 风格产品设计 Skill](../.agents/skills/anthropic-product-design/SKILL.md)。复用现有主题令牌与组件，确保 Twinkle Video 与参与项目的体验保持一致。
