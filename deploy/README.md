# VOZEB PRO 二开部署

本目录用于保存部署说明和 Nginx 示例。应用镜像使用仓库根目录的 `Dockerfile` 构建，数据库不打进应用镜像，也不由本部署方案创建；线上使用已有 PostgreSQL，并通过 `docker-compose.external-db.yml` 启动应用和生成 Worker。

## 1. 构建与导出镜像

在仓库根目录执行：

```powershell
$tag = "twinkle-video:v0.0.7"
docker build --pull --build-arg APT_MIRROR=http://mirrors.aliyun.com -t $tag .
docker save $tag -o deploy/twinkle-video-v0.0.7.tar
docker image inspect $tag --format '{{.Id}}'
```

导出的 tar 包只包含应用镜像。`postgres` 不属于该镜像；不要使用根目录的 `docker-compose.yml` 作为外部数据库部署方案，因为它会声明 PostgreSQL 服务。

## 2. 线上准备

将以下文件复制到服务器同一目录：

- `deploy/twinkle-video-v0.0.7.tar`
- `docker-compose.external-db.yml`
- `.env`（从 `.env.example` 复制并填写真实值）
- `deploy/nginx/vozeb-pro.conf.example`（改域名和证书路径后放入 Nginx 配置目录）

服务器必须能访问已有 PostgreSQL，并在 `.env` 设置完整的 `DATABASE_URL`。同时生成并保存独立的 `VOZEB_PRO_ENCRYPTION_KEY`、`VOZEB_PRO_INSTALL_TOKEN`、`VOZEB_PRO_MAINTENANCE_TOKEN` 和 `VOZEB_PRO_WORKER_TOKEN`，不要把它们写入镜像或提交到 Git。

## 3. 加载与启动

```bash
docker load -i deploy/twinkle-video-v0.0.7.tar
export VOZEB_PRO_IMAGE=twinkle-video:v0.0.7
docker compose -f docker-compose.external-db.yml up -d
docker compose -f docker-compose.external-db.yml ps
curl -fsS http://127.0.0.1:3000/api/health/live
```

若使用 `.env` 中的 `VOZEB_PRO_IMAGE`，可省略 `export`。应用和 `generation-worker` 共用该镜像，Worker 通过内部地址调用应用；外部 PostgreSQL 只由 `DATABASE_URL` 提供，不创建本地数据库容器。

## 4. 更新与回滚

更新时先导入新 tar，再执行：

```bash
docker load -i deploy/twinkle-video-v0.0.7.tar
export VOZEB_PRO_IMAGE=twinkle-video:v0.0.7
docker compose -f docker-compose.external-db.yml up -d
docker compose -f docker-compose.external-db.yml logs --tail=100 app generation-worker
```

回滚只需把 `VOZEB_PRO_IMAGE` 改回上一版本并重新执行 `up -d`。升级前备份 PostgreSQL 和 `/app/web/.data` 对应的 Docker volume；不要删除数据卷来处理应用升级问题。

## 5. 反向代理

将 `deploy/nginx/vozeb-pro.conf.example` 中的 `server_name`、证书路径替换为真实值。Nginx 代理到 `127.0.0.1:3000`，SSE 事件流路径已关闭代理缓冲；证书、域名、HTTPS 和防火墙策略由部署环境负责。
