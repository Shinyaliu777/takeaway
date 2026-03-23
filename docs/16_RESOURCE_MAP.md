# 资源地图

更新时间：2026-03-23

这份文档只回答一个问题：**接手人去哪里找东西。**

## 1. 代码目录

- 项目根目录：`/Users/liuxu/Desktop/codex/takeaway-app`
- 后端目录：`/Users/liuxu/Desktop/codex/takeaway-app/backend`
- 用户端小程序：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user`
- 商家端小程序：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant`
- 文档目录：`/Users/liuxu/Desktop/codex/takeaway-app/docs`

## 2. Git 与仓库

- GitHub 仓库：[Shinyaliu777/takeaway](https://github.com/Shinyaliu777/takeaway)
- 默认分支：`main`
- 本地仓库：`/Users/liuxu/Desktop/codex/takeaway-app`

## 3. 线上资源

### 后端
- 线上 API：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`
- 健康检查：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com/health`
- 云托管服务名：`takeaway-api`

### MySQL
- 数据库名：`takeaway`
- 内网地址：`10.23.101.169:3306`
- 外网地址：`sh-cynosdbmysql-grp-ho5rfjjo.sql.tencentcdb.com:20323`
- 已知账号名：
  - `root`
  - `takeaway_app`

说明：
- 密码不要写进 GitHub
- 如果需要登录数据库，去微信云托管 MySQL 后台查看账号并重置密码

### 对象存储 / 云环境
- 云环境 ID：`prod-6go4nj3pe13c85d8`
- 存储桶：`7072-prod-6go4nj3pe13c85d8-1413277342`
- 存储地域：`ap-shanghai`

说明：
- 当前项目已经在小程序侧接入 `wx.cloud`
- 旧的 `/uploads/...` 仍可能出现在历史数据里

## 4. 小程序配置入口

### 用户端
- 工程配置：[project.config.json](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/project.config.json)
- 运行配置：[config.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/config.js)
- App 入口：[app.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/app.js)

### 商家端
- 工程配置：[project.config.json](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/project.config.json)
- 运行配置：[config.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/config.js)
- App 入口：[app.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/app.js)

### 当前 AppID
- 用户端工程 AppID：`wxc4fd1aabc54a316c`
- 商家端工程 AppID：`wxc4fd1aabc54a316c`

说明：
- 当前两个工程配置里是同一个 AppID
- 如果后续要按正式双端发布，需要确认是否拆成两个独立 AppID

## 5. 后端配置入口

- 配置定义：[config.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/core/config.py)
- 云托管环境模板：[cloud-hosting.env](/Users/liuxu/Desktop/codex/takeaway-app/backend/cloud-hosting.env)
- 数据库会话与补列逻辑：[session.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/db/session.py)
- 接口入口：[routes.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/api/routes.py)
- 启动入口：[main.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/main.py)

## 6. 真实密钥去哪找

不要把下面这些值写进 GitHub：

- `WECHAT_APP_SECRET`
- `TOKEN_SIGNING_SECRET`
- MySQL 密码
- 商家真实生产账号密码
- 任何长期访问密钥

去这些地方找：

- 微信云托管后台：
  - 服务环境变量
  - MySQL 账号管理
  - 对象存储
- 微信开发者工具：
  - 当前 AppID
  - 本地项目配置

## 7. 常用排查入口

- 云托管运行日志
- 云托管 MySQL / DMS
- 微信开发者工具 Console / Network
- GitHub 提交历史

## 8. 当前已知联调重点

- 用户端首页付款方式弹层
- `/api/orders/create`
- 用户端订单详情付款截图上传
- 商家端店铺设置上传收款码
- 历史 `/uploads/...` 图片失效问题
