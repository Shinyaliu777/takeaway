# 接口说明

更新时间：2026-03-22

Base URL：

- `https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`

## 1. 公共接口

- `GET /health`
- `GET /api/shop`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/{product_id}`

## 2. 用户端接口

- `POST /api/user/login`
- `GET /api/user/profile`
- `PATCH /api/user/profile`
- `POST /api/user/uploads/payment-proof`
- `GET /api/addresses`
- `POST /api/addresses`
- `PUT /api/addresses/{address_id}`
- `DELETE /api/addresses/{address_id}`
- `POST /api/orders/create`
- `GET /api/orders`
- `GET /api/orders/{order_id}`
- `POST /api/orders/{order_id}/payment-proof`
- `GET /api/user/messages`
- `PATCH /api/user/messages/{message_id}/read`

## 3. 商家端接口

- `POST /api/merchant/login`
- `GET /api/merchant/orders`
- `GET /api/merchant/orders/{order_id}`
- `PATCH /api/merchant/orders/{order_id}`
- `POST /api/merchant/orders/{order_id}/confirm-payment`
- `POST /api/merchant/orders/{order_id}/reject-payment`
- `GET /api/merchant/products`
- `POST /api/merchant/products`
- `PATCH /api/merchant/products/{product_id}`
- `GET /api/merchant/categories`
- `POST /api/merchant/categories`
- `PATCH /api/merchant/categories/{category_id}`
- `DELETE /api/merchant/categories/{category_id}`
- `GET /api/merchant/shop`
- `PUT /api/merchant/shop`
- `GET /api/merchant/combo-rules`
- `POST /api/merchant/combo-rules`
- `PATCH /api/merchant/combo-rules/{rule_id}`
- `DELETE /api/merchant/combo-rules/{rule_id}`
- `GET /api/merchant/users`
- `GET /api/merchant/users/{user_id}`
- `GET /api/merchant/messages`
- `PATCH /api/merchant/messages/{message_id}/read`
- `POST /api/merchant/uploads/image`

## 4. 当前接口要点

- 用户和商家都使用 Bearer token
- 用户端金额以后端结算为准
- `GET /api/shop` 会返回当前启用套餐规则和额外米饭价格
- 商家端规则管理通过 `combo-rules` 接口完成
- 商家端 `shop` 接口可更新推荐位和加饭价格
