# VOZEB PRO 本地前后端启动教程

## 1. 项目架构与端口说明

VOZEB PRO 使用 Next.js App Router：页面前端和 `/api/*` Route Handler 后端位于同一个 `web` 项目，生成任务 Worker 由开发脚本一并启动。

本项目支持以下本地运行方式：

| 模式 | 适用场景 | 端口变量 |
| --- | --- | --- |
| 单端口全栈（推荐） | 日常开发，前端、后端 API 和 Worker 一次启动 | `PORT`，默认 `3000` |
| 前后端分端口 | 需要手动切换端口或单独观察前端/API 请求 | `FRONTEND_PORT` 默认 `3000`，`BACKEND_PORT` 默认 `3001` |

分端口模式下，浏览器只访问前端端口；前端开发服务器会把 `/api/*` 透明代理到 `VOZEB_PRO_BACKEND_ORIGIN`，未显式设置时使用 `http://127.0.0.1:<BACKEND_PORT>`。因此现有前端代码仍使用同源 `/api/*`，不会产生 CORS 或登录 Cookie 跨域问题。

## 2. 环境准备

- Node.js 22
- pnpm 10 或更高版本（仓库声明版本为 pnpm 11.9.0）
- PostgreSQL 16
- 可选：短剧合成和本地转码需要 FFmpeg

在根目录安装 Web 依赖：

```powershell
cd C:\path\to\VOZEB-PRO\web
pnpm install --frozen-lockfile
cd ..
```

首次运行时复制环境变量模板：

```powershell
Copy-Item .env.example web/.env.local
```

至少检查 `web/.env.local` 中的数据库配置：

```dotenv
VOZEB_PRO_DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://vozeb_pro:你的数据库密码@127.0.0.1:5432/vozeb_pro
VOZEB_PRO_DATABASE_SSL=0
```

如果 PostgreSQL 的 `5432` 被占用或禁用，可把 PostgreSQL 改到其他端口，并同步修改 `DATABASE_URL`，例如：

```dotenv
DATABASE_URL=postgres://vozeb_pro:你的数据库密码@127.0.0.1:55432/vozeb_pro
```

不要把真实密码、安装令牌或加密密钥提交到 Git。

## 3. 推荐：单端口启动前后端

默认使用 `3000`：

```powershell
pnpm dev
```

端口被占用时，在 PowerShell 中手动切换，例如改为 `4100`：

```powershell
$env:PORT="4100"
pnpm dev
```

访问：

- 安装页：`http://localhost:4100/install`
- 前端页面：`http://localhost:4100`
- 后端健康检查：`http://localhost:4100/api/health/live`

当前终端关闭后，`$env:PORT` 不会永久写入系统。要恢复默认端口，可执行：

```powershell
Remove-Item Env:PORT -ErrorAction SilentlyContinue
```

macOS/Linux 对应命令：

```bash
PORT=4100 pnpm dev
```

## 4. 前后端使用不同端口

打开两个根目录终端，并确保两边填写相同的 `FRONTEND_PORT` 和 `BACKEND_PORT`。

终端一：启动后端 Route Handler 和生成 Worker，例如后端使用 `4201`：

```powershell
$env:FRONTEND_PORT="4200"
$env:BACKEND_PORT="4201"
pnpm dev:backend
```

终端二：启动前端并连接到后端 `4201`：

```powershell
$env:FRONTEND_PORT="4200"
$env:BACKEND_PORT="4201"
pnpm dev:frontend
```

然后访问：

- 前端入口：`http://localhost:4200`
- 安装页：`http://localhost:4200/install`
- 经前端代理的健康检查：`http://localhost:4200/api/health/live`
- 后端直连健康检查：`http://localhost:4201/api/health/live`

macOS/Linux 对应命令：

```bash
FRONTEND_PORT=4200 BACKEND_PORT=4201 pnpm dev:backend
FRONTEND_PORT=4200 BACKEND_PORT=4201 pnpm dev:frontend
```

## 5. 前端手动指定后端地址

如果后端不在本机，或不想通过 `BACKEND_PORT` 推导地址，可在启动前端时显式设置完整 HTTP(S) Origin：

```powershell
$env:FRONTEND_PORT="4300"
$env:VOZEB_PRO_BACKEND_ORIGIN="http://192.168.1.20:4301"
pnpm dev:frontend
```

`VOZEB_PRO_BACKEND_ORIGIN` 只填写 Origin，不要追加 `/api` 或其他路径。需要让应用生成的公开链接指向反向代理或本地隧道时，可额外设置：

```powershell
$env:VOZEB_PRO_LOCAL_PUBLIC_ORIGIN="https://your-local-tunnel.example.com"
```

## 6. 端口排查与切换

检查端口是否已被占用：

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,4200,4201 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress,LocalPort,OwningProcess
```

查看占用端口的进程：

```powershell
Get-Process -Id <OwningProcess>
```

不确定可用端口时，选择 `1024` 到 `65535` 之间未监听的端口，然后重新设置变量并启动。不要直接结束来源不明的系统进程。

## 7. 启动成功验收

PowerShell 中执行：

```powershell
Invoke-WebRequest http://localhost:4200/api/health/live -UseBasicParsing
Invoke-WebRequest http://localhost:4201/api/health/live -UseBasicParsing
```

返回 HTTP `200` 表示前端代理和后端均可访问。首次安装访问 `/install`，完成数据库初始化和管理员创建。

停止服务时，在对应终端按 `Ctrl+C`。如果切换了分端口配置，必须同时重启前端和后端，避免前端仍代理到旧端口。
