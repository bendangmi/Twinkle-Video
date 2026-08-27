# VOZEB PRO 二开部署

本目录用于保存部署说明、外部 PostgreSQL Compose 文件和 Nginx 示例。应用镜像使用仓库根目录的 `Dockerfile` 构建，数据库不打进应用镜像，也不由本部署方案创建；线上使用已有 PostgreSQL，并通过本目录的 `docker-compose.yaml` 启动应用和生成 Worker。

镜像版本以官方最新版本为基线并追加 `custom.N`。当前官方版本为 `v0.0.7`，本次二开镜像为 `v0.0.7.custom.2`；同一官方版本后续依次使用 `custom.3`、`custom.4`，官方版本升级后重新从 `custom.1` 开始。

## 快速部署流程

### 1. 服务器准备

服务器需要安装 Docker Engine、Docker Compose Plugin、Nginx，并准备一台可从服务器访问的 PostgreSQL 14+ 数据库。数据库账号需要具备目标数据库的建表和读写权限。

生产环境建议使用 HTTPS 域名。应用容器只绑定宿主机 `127.0.0.1:3000`，公网访问统一经过 Nginx。

### 2. 准备文件

在服务器创建部署目录，并将以下文件复制到同一目录：

```text
twinkle-video-v0.0.7.custom.2.tar
docker-compose.yaml
.env
```

示例命令：

```bash
mkdir -p /opt/twinkle-video
cd /opt/twinkle-video
cp /path/to/.env.example .env
chmod 600 .env
```

`.env` 从仓库根目录的 `.env.example` 复制，至少填写以下生产配置：

```dotenv
NEXT_PUBLIC_SITE_URL=https://你的域名.example.com
VOZEB_PRO_IMAGE=twinkle-video:v0.0.7.custom.2
VOZEB_PRO_DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://用户:URL编码后的密码@数据库地址:5432/数据库名
VOZEB_PRO_DATABASE_SSL=1
VOZEB_PRO_DATABASE_SSL_REJECT_UNAUTHORIZED=1
VOZEB_PRO_ENCRYPTION_KEY=稳定的32字节随机值
VOZEB_PRO_INSTALL_TOKEN=至少32位随机安装令牌
VOZEB_PRO_MAINTENANCE_TOKEN=独立的至少32位维护令牌
VOZEB_PRO_WORKER_TOKEN=独立的至少32位Worker令牌
```

推荐使用 `openssl rand -hex 32` 生成随机值。四个密钥必须彼此不同；`VOZEB_PRO_ENCRYPTION_KEY` 部署后不要更换，也不要把真实 `.env` 提交到 Git。

### 3. 加载并检查镜像

```bash
cd /opt/twinkle-video
docker load -i twinkle-video-v0.0.7.custom.2.tar
docker image inspect twinkle-video:v0.0.7.custom.2 --format '{{.Id}}'
docker compose -f docker-compose.yaml config --services
```

`config --services` 只能显示 `app` 和 `generation-worker`。如果显示 `postgres`，说明误用了根目录的 `docker-compose.yml`；本教程只使用外部 PostgreSQL。

### 4. 启动和首次初始化

```bash
docker compose -f docker-compose.yaml up -d
docker compose -f docker-compose.yaml ps
curl -fsS http://127.0.0.1:3000/api/health/live
```

健康检查成功后，打开 `https://你的域名.example.com/install`，输入 `VOZEB_PRO_INSTALL_TOKEN` 创建第一个管理员。随后在后台配置模型渠道、对象存储和支付渠道，并实际提交一次生成任务验证 Worker。

查看日志：

```bash
docker compose -f docker-compose.yaml logs -f --tail=200 app generation-worker
```

### 5. 配置 Nginx

复制 `deploy/nginx/vozeb-pro.conf.example`，修改 `server_name`、`ssl_certificate` 和 `ssl_certificate_key`，放入 Nginx 站点配置目录：

```bash
nginx -t
systemctl reload nginx
curl -fsS https://你的域名.example.com/api/health/live
```

示例已为 Agent SSE 事件流关闭 `proxy_buffering`。不要将 3000 端口直接暴露到公网。

## 详细操作：构建与导出镜像

在 Windows 开发机上，从仓库根目录执行部署目录脚本。脚本会读取 `VERSION`，构建同名版本镜像，导出到 `deploy`，并打印镜像 ID 与 SHA256：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-image.ps1
```

如果 Docker 使用其他 Debian 或 npm 镜像，可通过参数覆盖：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-image.ps1 `
  -NpmRegistry https://registry.npmjs.org `
  -AptMirror https://deb.debian.org
```

导出的 tar 包只包含应用镜像。`postgres` 不属于该镜像；不要使用根目录的 `docker-compose.yml` 作为外部数据库部署方案，因为它会声明 PostgreSQL 服务。

## 详细操作：线上准备

将以下文件复制到服务器同一目录：

- `deploy/twinkle-video-v0.0.7.custom.2.tar`
- `deploy/docker-compose.yaml`
- `.env`（从 `.env.example` 复制并填写真实值）
- `deploy/nginx/vozeb-pro.conf.example`（改域名和证书路径后放入 Nginx 配置目录）

服务器必须能访问已有 PostgreSQL，并在 `.env` 设置完整的 `DATABASE_URL`。同时生成并保存独立的 `VOZEB_PRO_ENCRYPTION_KEY`、`VOZEB_PRO_INSTALL_TOKEN`、`VOZEB_PRO_MAINTENANCE_TOKEN` 和 `VOZEB_PRO_WORKER_TOKEN`，不要把它们写入镜像或提交到 Git。

## 详细操作：加载与启动

```bash
docker load -i deploy/twinkle-video-v0.0.7.custom.2.tar
export VOZEB_PRO_IMAGE=twinkle-video:v0.0.7.custom.2
docker compose -f docker-compose.yaml up -d
docker compose -f docker-compose.yaml ps
curl -fsS http://127.0.0.1:3000/api/health/live
```

若使用 `.env` 中的 `VOZEB_PRO_IMAGE`，可省略 `export`。应用和 `generation-worker` 共用该镜像，Worker 通过内部地址调用应用；外部 PostgreSQL 只由 `DATABASE_URL` 提供，不创建本地数据库容器。

## 详细操作：更新与回滚

更新时先导入新 tar，再执行：

```bash
docker load -i deploy/twinkle-video-v0.0.7.custom.2.tar
export VOZEB_PRO_IMAGE=twinkle-video:v0.0.7.custom.2
docker compose -f docker-compose.yaml up -d
docker compose -f docker-compose.yaml logs --tail=100 app generation-worker
```

回滚只需把 `VOZEB_PRO_IMAGE` 改回上一版本并重新执行 `up -d`。升级前备份 PostgreSQL 和 `/app/web/.data` 对应的 Docker volume；不要删除数据卷来处理应用升级问题。

升级时不要执行 `docker compose down -v`。外部 PostgreSQL 和 `vozeb-pro-data` 数据卷都应在升级前备份；回滚只切换镜像标签，不删除数据卷。

## 常见问题

- **数据库连接失败**：检查 PostgreSQL 防火墙、白名单、账号权限、端口和 SSL 参数；容器内不能使用宿主机 `localhost` 连接云数据库。
- **Worker 认证失败**：确认 `VOZEB_PRO_WORKER_TOKEN` 在 `app` 和 `generation-worker` 中完全一致，且不同于维护令牌。
- **安装页打不开**：先检查 `curl http://127.0.0.1:3000/api/health/live`，再查看应用和 Nginx 日志。
- **SSE 断流**：确认 Nginx 使用示例中的 Agent events 配置，并保持 `proxy_buffering off`。
- **媒体上传失败**：确认 Docker volume 可写；启用 S3 兼容存储时，在后台完成 Endpoint、Bucket、Region 和密钥配置。

## 反向代理

将 `deploy/nginx/vozeb-pro.conf.example` 中的 `server_name`、证书路径替换为真实值。Nginx 代理到 `127.0.0.1:3000`，SSE 事件流路径已关闭代理缓冲；证书、域名、HTTPS 和防火墙策略由部署环境负责。
