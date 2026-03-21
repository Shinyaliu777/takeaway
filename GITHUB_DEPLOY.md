# GitHub Deploy Notes

目标：不再手动上传 zip，改为把项目推到 GitHub，然后在微信云托管里从代码仓库构建后端镜像。

## 推荐仓库结构

直接把整个项目作为一个仓库即可：

- `backend/`
- `miniprogram-user/`
- `miniprogram-merchant/`

云托管构建后端时，只需要把构建上下文指到 `backend/`。

## 1. 本地初始化 Git 仓库

在项目根目录执行：

```bash
cd /Users/liuxu/Desktop/codex/takeaway-app
git init
git add .
git commit -m "Initial takeaway app import"
```

项目根目录已经补了 `.gitignore`，默认会忽略：

- `backend/data/`
- `.env.local`
- Python 缓存

同时会保留后端默认商品图和店铺图。

## 2. 推送到 GitHub

在 GitHub 新建一个空仓库后执行：

```bash
cd /Users/liuxu/Desktop/codex/takeaway-app
git remote add origin <你的GitHub仓库地址>
git branch -M main
git push -u origin main
```

## 3. 微信云托管配置代码仓库构建

在微信云托管中：

1. 进入服务 `takeaway-api`
2. 新建版本
3. 选择 `代码仓库` 或 `Git 仓库` 方式
4. 连接你的 GitHub 仓库
5. 构建上下文填写：`backend`
6. Dockerfile 路径填写：`backend/Dockerfile`

## 4. 线上环境变量

建议至少填写：

```env
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
TOKEN_SIGNING_SECRET=你自己生成的一串长随机字符串
PUBLIC_BASE_URL=https://你的云托管公网地址
DATABASE_URL=mysql+pymysql://root:Lx0020810@10.23.101.169:3306/takeaway
PORT=8000
APP_DATA_DIR=/app/runtime
IMAGE_UPLOAD_MAX_BYTES=5242880
```

## 5. 发布后的检查

先检查：

- `/health`
- 商家登录
- 用户登录
- 创建订单
- 上传付款截图
- 商家确认到账

## 6. 当前更推荐代码仓库，而不是网页传 zip 的原因

- 网页传包容易失败
- GitHub 构建更稳定
- 后续每次修改只要推代码，不用反复重新压 zip
- 版本记录更清晰，回滚也更容易
