# EnvPortal

EnvPortal 是一个面向运维和实施人员的轻量级环境档案门户，用来集中维护客户/机构、环境地址、登录信息、数据库信息、远程连接信息和自由标签。

当前版本：`2.0.1`

## 核心能力

- 机构/客户按“编码 + 名称”管理，避免通过重复输入机构名称来分组。
- 每个服务器/环境支持独立标签，标签可以跨机构自由过滤，例如 `DEMO`、`教育`、`社内`。
- 标签过滤支持多选 AND 条件，并包含系统自动生成标签，例如数据库类型、数据库版本、RDP/SSH。
- 首页按机构显示紧凑摘要，鼠标悬停或点击环境后展开详情卡片，减少默认页面空白。
- 环境健康检查会返回 HTTP 状态、响应时间、TTL 和 OS 推测，并按分钟刷新。
- 数据库信息支持地址、端口、实例/库、用户、密码、类型、版本字段。
- 数据库类型和版本支持自动探测，当前支持 Oracle 与 PostgreSQL。
- 远程连接信息支持 RDP/SSH 类型，RDP 可一键启动 mstsc，并自动把密码复制到剪贴板。
- RDP 文件可生成并签名；工具会自动创建 EnvPortal 自签名证书，也提供证书下载。
- 全站 i18n 多语资源化，默认日文，支持中文，并记住上次选择语言。
- 顶部主题区使用 `images/sea01.jpg` 作为虚化海水背景，整体配色统一为蓝青色调。
- 数据存储使用本地 JSON/CSV 文件，不依赖真实数据库。
- 后端已切换为 Python，保留 `start.bat`，并提供 `start.sh`，为后续 Linux 部署做准备。

## 启动方式

Windows:

```bat
start.bat
```

Linux / macOS:

```sh
./start.sh
```

默认读取 `.env`：

```env
PORT=8999
BIND_ADDRESS=0.0.0.0
AUTH_PASSWORD=...
```

访问地址：

```text
http://localhost:8999
```

`BIND_ADDRESS=0.0.0.0` 时会监听所有网卡，局域网内可使用本机 IP 访问。

## 文件说明

- `index.html`：环境检索首页。
- `admin.html`：环境数据管理。
- `rdp.html`：服务器/远程连接信息管理。
- `i18n.js`：日文/中文多语资源。
- `server.py`：Python 后端，负责认证、文件保存、健康检查、DB 探测、RDP 生成/签名/连接。
- `run.py`：启动入口。
- `db_versions.json`：数据库类型和版本候选。
- `tags.json`：自由标签存储。
- `data.csv`：环境档案数据，本地运行数据文件。
- `rdp.csv`：远程连接档案数据，本地运行数据文件。
- `images/sea01.jpg`：顶部主题背景图。

## 版本规则

本项目从 `2.0.0` 开始使用语义化版本号：

- `MAJOR`：数据结构、运行方式或主要交互发生不兼容变化。
- `MINOR`：新增功能但保持兼容。
- `PATCH`：修复问题、微调样式或文案。

每次升级都应同步更新：

- `VERSION`
- `CHANGELOG.md`
- `README.md` 中的当前版本和功能说明

## RDP 自动登录说明

Windows 自带 `mstsc` 没有官方密码参数。EnvPortal 会尝试写入 Windows Credential Manager，并启动 `mstsc`；但在部分 Windows / NLA / CredSSP / 组策略环境中，保存凭据可能仍被忽略。

因此当前 RDP 连接按钮会同时把密码复制到剪贴板。若 Windows 弹出密码输入框，直接粘贴即可。
