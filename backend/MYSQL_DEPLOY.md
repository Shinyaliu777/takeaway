# MySQL Deployment Notes

当前后端已经兼容 MySQL，表结构会在服务启动时自动创建。

## 1. 准备 MySQL

推荐准备一个云端 MySQL 8.x 实例，并创建：

- 数据库：`takeaway`
- 用户：例如 `takeaway_app`
- 权限：对 `takeaway` 库授予读写建表权限

## 2. 配置云托管环境变量

至少需要：

```env
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
TOKEN_SIGNING_SECRET=你自己生成的一串长随机字符串
PUBLIC_BASE_URL=https://你的云托管公网地址
DATABASE_URL=mysql+pymysql://takeaway_app:你的密码@你的mysql地址:3306/takeaway
PORT=8000
APP_DATA_DIR=/app/runtime
IMAGE_UPLOAD_MAX_BYTES=5242880
```

说明：

- `DATABASE_URL` 必须使用 `mysql+pymysql://`
- 如果密码里包含特殊字符，建议先做 URL 编码
- 当前应用启动时会自动执行建表

## 3. 发布包

推荐使用这个轻量包：

- `/Users/liuxu/Desktop/codex/takeaway-app-backend-cloudhosting-mysql-v12-lite.zip`

这个包已经去掉本地 SQLite 数据文件，更适合云端 MySQL。

## 4. 上线后检查

先看：

- `/health`
- 用户登录
- 商家登录
- 新建订单
- 商家确认付款

如果要单独验证数据库连通性，可以在容器里运行：

```bash
python3 scripts/verify_database.py
```

输出 `database connection ok` 就说明数据库连通正常。

## 5. 数据初始化说明

当前应用启动后会自动：

- 建表
- 初始化店铺、分类、商品、演示账号

如果你不想在线上保留演示数据，后续可以再把 `seed_data()` 拆成开发/生产两套策略。
