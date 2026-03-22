# 架构说明

更新时间：2026-03-22

## 1. 总体结构

系统由三部分组成：

1. 用户端微信小程序
2. 商家端微信小程序
3. FastAPI 后端服务

运行环境：

- 代码仓库：GitHub
- 服务部署：微信云托管
- 数据库：微信云托管 MySQL

## 2. 目录结构

```text
takeaway-app/
  backend/
    app/
      api/
      core/
      db/
      models/
      schemas/
      services/
  miniprogram-user/
  miniprogram-merchant/
  docs/
```

## 3. 后端

### 3.1 主要职责

- 鉴权
- 商品 / 分类 / 地址 / 订单接口
- 付款截图上传
- 商家审核流程
- 消息通知
- 套餐规则结算
- 商家后台规则管理

### 3.2 关键文件

- [routes.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/api/routes.py)
- [entities.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/models/entities.py)
- [contracts.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/schemas/contracts.py)
- [pricing.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/pricing.py)
- [bootstrap.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/bootstrap.py)
- [session.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/db/session.py)

### 3.3 当前主要数据表

- `user`
- `merchantuser`
- `shop`
- `category`
- `product`
- `comborule`
- `useraddress`
- `order`
- `orderitem`
- `paymentorder`
- `merchantmessage`
- `usermessage`

## 4. 用户端

### 4.1 主要职责

- 登录
- 菜单展示
- 时段切换
- 实时选菜
- 实时套餐预览
- 购物车核对
- 地址和订单
- 付款截图上传

### 4.2 关键文件

- [app.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/app.js)
- [request.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/utils/request.js)
- [pricing.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/utils/pricing.js)
- [index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/index/index.js)
- [cart.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/cart/cart.js)

## 5. 商家端

### 5.1 主要职责

- 订单管理
- 商品管理
- 分类管理
- 套餐规则管理
- 推荐位管理
- 用户中心
- 收款码和店铺资料维护

### 5.2 关键文件

- [request.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/utils/request.js)
- [index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/index/index.js)
- [products.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/products/products.js)
- [rules.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/rules/rules.js)
- [shop.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/shop/shop.js)

## 6. 配置驱动能力

目前已经后台化的项目有：

- 套餐规则
- 套餐价格
- 额外米饭价格
- 首页推荐位
- 商品午餐 / 晚餐可点

仍然主要由代码控制的项目有：

- 订单状态机
- 鉴权方式
- 付款截图审核流程
