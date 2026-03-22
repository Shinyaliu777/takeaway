# MySQL 部署

更新时间：2026-03-22

## 1. 当前推荐配置

- MySQL 8.x
- 数据库：`takeaway`
- 应用账号：`takeaway_app`

## 2. 连接串

```env
DATABASE_URL=mysql+pymysql://takeaway_app:你的密码@10.23.101.169:3306/takeaway
```

## 3. 当前启动行为

后端启动时会自动：

- 建表
- 补历史缺失字段
- 初始化默认店铺 / 商品 / 套餐规则

## 4. 当前规则表

- `comborule`

字段：

- `name`
- `meat_count`
- `veg_count`
- `price`
- `sort_order`
- `enabled`
