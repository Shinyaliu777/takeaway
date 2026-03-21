# 微信云托管上线说明

本文档用于将当前项目部署到微信云托管，并发布给体验成员或正式上线。

## 一、当前项目部署方式

当前后端已补齐容器化文件，可直接以 Docker 镜像方式部署：

- Dockerfile：`/Users/liuxu/Desktop/codex/takeaway-app/backend/Dockerfile`
- 环境变量模板：`/Users/liuxu/Desktop/codex/takeaway-app/backend/.env.example`

推荐部署结构：

- 用户端小程序：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user`
- 商家端小程序：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant`
- 后端服务：`/Users/liuxu/Desktop/codex/takeaway-app/backend`

## 二、上线前必须准备

### 1. 小程序账号

- 你的正式小程序 `AppID`
- 小程序 `AppSecret`
- 小程序管理员权限

### 2. 微信云托管环境

在微信云开发/云托管控制台创建服务环境。

### 3. 数据库

推荐直接使用 MySQL，不建议正式环境继续使用 SQLite。

建议准备：

- `DATABASE_URL=mysql+pymysql://用户名:密码@主机:端口/数据库名`

### 4. 环境变量

后端至少需要：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `TOKEN_SIGNING_SECRET`
- `PUBLIC_BASE_URL`
- `DATABASE_URL`
- `PORT`

## 三、后端部署步骤

### 1. 构建镜像

以 `backend` 目录为构建上下文。

### 2. 部署到微信云托管

容器启动命令已在 `Dockerfile` 中定义，无需额外写命令。

服务启动后会监听：

- `0.0.0.0:${PORT}`

### 3. 环境变量建议

示例：

```env
WECHAT_APP_ID=你的正式AppID
WECHAT_APP_SECRET=你的正式AppSecret
TOKEN_SIGNING_SECRET=你自己生成的一串长随机字符串
PUBLIC_BASE_URL=https://你的云托管访问域名
DATABASE_URL=mysql+pymysql://root:password@mysql-host:3306/takeaway
PORT=8000
APP_DATA_DIR=/app/runtime
```

## 四、小程序前端改造点

部署后，需要把两个小程序的接口地址改成线上地址。

当前文件：

- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/config.js`
- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/config.js`

需要把：

- `apiBase: "http://192.168.100.16:8000"`

改成你的云托管线上地址，例如：

- `apiBase: "https://你的线上域名"`

## 五、微信后台配置

在小程序后台配置合法域名：

- `request 合法域名`
- `uploadFile 合法域名`

它们都应指向你的后端线上域名。

## 六、上线前检查清单

- 后端健康检查正常：`/health`
- 商品图片可访问
- 用户端可登录
- 购物车可创建订单
- 订单详情可上传付款截图
- 商家端可看到付款截图
- 商家可确认到账
- 商家可更新为配送中和已完成
- 消息中心状态正常

## 七、当前业务说明

本项目当前不使用第三方在线支付，采用：

1. 用户创建订单
2. 用户上传付款成功截图
3. 商家人工审核确认到账
4. 商家推进配送流程

因此提审时，页面说明和产品描述必须与该流程一致，不要描述为“已接入微信支付/支付宝/TNG 自动支付”。

## 八、建议发布顺序

1. 先部署后端到云托管
2. 改前端接口地址为线上域名
3. 微信开发者工具上传体验版
4. 添加体验成员测试
5. 清理测试数据
6. 提交审核
7. 审核通过后发布
