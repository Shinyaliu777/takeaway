# 微信云托管部署

更新时间：2026-03-22

## 1. 推荐方式

当前推荐从 GitHub 仓库触发微信云托管流水线，而不是手工上传 zip。

仓库：

- [https://github.com/Shinyaliu777/takeaway](https://github.com/Shinyaliu777/takeaway)

## 2. 当前目标环境

- 服务名：`takeaway-api`
- 端口：`8000`
- 公网地址：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`

## 3. 构建参数

- 选择方式：`执行流水线`
- 仓库：`Shinyaliu777/takeaway`
- 分支：`main`
- 构建上下文：`backend`
- Dockerfile：`backend/Dockerfile`
- 容器端口：`8000`

## 4. 环境变量

```env
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
TOKEN_SIGNING_SECRET=你自己生成的一串长随机字符串
PUBLIC_BASE_URL=https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com
DATABASE_URL=mysql+pymysql://takeaway_app:你的密码@10.23.101.169:3306/takeaway
PORT=8000
APP_DATA_DIR=/app/runtime
IMAGE_UPLOAD_MAX_BYTES=5242880
COS_SECRET_ID=你的腾讯云API密钥SecretId
COS_SECRET_KEY=你的腾讯云API密钥SecretKey
COS_REGION=存储桶地域，例如 ap-singapore
COS_BUCKET=完整桶名，例如 takeaway-1250000000
COS_DOMAIN=可选，自定义CDN或COS访问域名
COS_PATH_PREFIX=takeaway
```

## 5. 发布后检查

- `/health`
- 用户登录
- 菜单页实时计价
- 商家规则管理
- 商家用户中心
- 用户端上传付款截图后，返回的 `image_url` 应优先是 COS / CDN 地址，不应依赖容器本地 `/uploads`
