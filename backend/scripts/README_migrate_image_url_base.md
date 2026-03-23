# migrate_image_url_base.py

扫描并可选替换数据库里的图片 URL 域名前缀。

适用场景：

- 旧公网域名切到新域名
- `/uploads/...`、COS/CDN 域名统一替换
- 数据库存量图片 URL 批量修正

## 覆盖字段

- `shop.logo_url`
- `shop.wechat_qr_url`
- `shop.alipay_qr_url`
- `shop.tng_qr_url`
- `shop.featured_cards_json`
- `product.image_url`
- `paymentorder.qr_code_url`
- `paymentorder.proof_image_url`
- `user.avatar_url`

## 运行命令

只扫描，不写库：

```bash
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --database-url 'mysql+pymysql://用户名:密码@主机:端口/数据库名' \
  --old-base 'https://old.example.com'
```

执行替换：

```bash
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --database-url 'mysql+pymysql://用户名:密码@主机:端口/数据库名' \
  --old-base 'https://old.example.com' \
  --new-base 'https://new.example.com' \
  --apply
```

已设置 `DATABASE_URL` 时，可省略 `--database-url`：

```bash
DATABASE_URL='mysql+pymysql://用户名:密码@主机:端口/数据库名' \
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --old-base 'https://old.example.com'
```

## 输出说明

- 默认 dry-run，只打印命中记录
- 传 `--apply` 才会写库
- 输出会列出每个字段的命中数与总命中数
- `shop.featured_cards_json` 这类 JSON 文本字段也会扫描并执行字符串替换

## 执行建议

- 先跑一次 dry-run，确认命中范围
- 再带 `--apply` 执行正式替换
- 正式执行前先备份数据库，或至少先导出目标表
- 替换完成后抽查：
  - `shop`
  - `product`
  - `paymentorder`
  - 实际线上接口返回值

## 迁移前后最短抽查命令

迁移前先看命中范围：

```bash
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --database-url 'mysql+pymysql://用户名:密码@主机:端口/数据库名' \
  --old-base 'https://old.example.com'
```

迁移后再扫一次旧域名，预期应为 `No matching records found.`：

```bash
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --database-url 'mysql+pymysql://用户名:密码@主机:端口/数据库名' \
  --old-base 'https://old.example.com'
```

直接抽查线上接口返回值：

```bash
curl -sS https://你的线上域名/api/shop
```

如果只想快速确认返回里是否还有旧域名：

```bash
curl -sS https://你的线上域名/api/shop | rg 'old.example.com'
```

直接抽查数据库中的关键表：

```bash
python3 /Users/liuxu/Desktop/codex/takeaway-app/backend/scripts/migrate_image_url_base.py \
  --database-url 'mysql+pymysql://用户名:密码@主机:端口/数据库名' \
  --old-base 'https://new.example.com'
```

这个命令的意义不是再迁移一次，而是确认新域名已经写进：

- `shop.*`
- `product.image_url`
- `paymentorder.proof_image_url / qr_code_url`

如果迁移后线上接口还是旧值，优先排查：

- 云托管当前运行 revision
- 服务是否已经重启
- 数据库是否连的是目标环境
