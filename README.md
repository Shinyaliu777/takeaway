# 单店外卖小程序项目说明

本项目是一个面向单店场景的外卖微信小程序系统，包含：

- 用户端小程序
- 商家端小程序
- FastAPI 后端服务

当前版本的核心业务已经固定为：

- 不接第三方在线支付
- 用户下单后上传付款成功截图
- 商家查看截图并手动确认到账
- 商家确认到账后再进入配送流程

## 当前项目结构

- `backend/`：FastAPI 后端，开发环境默认 SQLite
- `miniprogram-user/`：用户端原生微信小程序
- `miniprogram-merchant/`：商家端原生微信小程序
- `docs/`：V2.0 需求、架构、设计、说明文档
- `HANDOFF_2026-03-21.md`：当前交接文档
- `WECHAT_CLOUD_HOSTING_DEPLOY.md`：云托管部署说明

## 当前业务流程

### 用户端

1. 浏览店铺、分类、商品
2. 查看商品详情并加入购物车
3. 选择地址并创建订单
4. 在订单详情上传付款截图
5. 等待商家确认到账
6. 查看订单进入已付款、配送中、已完成

### 商家端

1. 登录商家端
2. 查看订单和待审核付款截图
3. 在订单详情确认到账或退回截图
4. 推进订单状态为配送中、已完成

## 主要功能

### 用户端

- 微信登录
- 菜品分类浏览
- 商品详情页
- 购物车
- 地址管理
- 创建订单
- 上传付款截图
- 订单列表与订单详情
- 消息中心
- 个人中心
- 首页付款方式引导
  - 微信收款码
  - 支付宝收款码
  - TNG 收款码
  - 查看与保存到本地相册

### 商家端

- 商家账号登录
- 工作台
- 订单列表
- 订单详情
- 付款截图审核
- 商品管理
- 分类管理
- 店铺信息管理
- 消息列表
- 用户识别增强
  - 用户昵称
  - 历史下单次数
  - 是否老客户

### 后端

- 用户与商家鉴权
- 商品、分类、地址、订单接口
- 图片上传
- 付款截图上传
- 商家手动确认付款
- 订单状态流转
- 站内消息通知
- 微信云托管部署支持

## 订单与支付状态

### 订单状态

- `PENDING_PAYMENT`：待上传付款截图
- `PAYMENT_REVIEW`：已上传截图，等待商家确认
- `PAID`：商家已确认到账
- `DELIVERING`：配送中
- `COMPLETED`：已完成

### 支付状态

- `UNPAID`：未提交截图
- `PROOF_UPLOADED`：截图已提交
- `SUCCESS`：商家确认到账
- `FAILED`：截图未通过，需重新上传

## 本地启动

### 启动后端

```bash
cd /Users/liuxu/Desktop/codex/takeaway-app/backend
python3 -m pip install -r requirements.txt
./start_backend.sh
```

默认本地地址：

- `http://127.0.0.1:8000`

接口文档：

- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 导入微信开发者工具

用户端项目：

- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user`

商家端项目：

- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant`

## 线上云托管

当前后端服务已部署到微信云托管：

- 服务名：`takeaway-api`
- 公网地址：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`
- 健康检查：[health](https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com/health)

前端当前默认指向线上地址：

- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/config.js`
- `/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/config.js`

## 测试账号

### 商家端

- 用户名：`admin`
- 密码：`admin123`

## 当前关键接口

### 用户端

- `POST /api/user/login`
- `GET /api/shop`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/{id}`
- `POST /api/orders/create`
- `POST /api/user/uploads/payment-proof`
- `POST /api/orders/{order_id}/payment-proof`
- `GET /api/orders`
- `GET /api/orders/{order_id}`

### 商家端

- `POST /api/merchant/login`
- `GET /api/merchant/orders`
- `GET /api/merchant/orders/{order_id}`
- `POST /api/merchant/orders/{order_id}/confirm-payment`
- `POST /api/merchant/orders/{order_id}/reject-payment`
- `PATCH /api/merchant/orders/{order_id}`

## 当前实现说明

- 真实在线支付已经移除
- 付款确认由商家人工审核截图完成
- 付款确认成功后才扣减库存
- 用户和商家都会收到站内消息
- 图片上传默认限制为 `5 MB`
- 当前数据库开发环境为 SQLite
- 商家端可以区分用户：
  - 微信昵称
  - 历史订单数
  - 是否老客户
- 首页收款区已经改成更轻的交互：
  - 不在首页堆三张码
  - 先选支付方式
  - 再打开底部弹层查看与保存

## 当前已知问题

- 云托管线上版本里，部分默认商品图和店铺图仍可能出现 `404`
- 真机扫码调试可访问后端，但上传后的体验版/审核版还受合法域名规则约束
- 用户端截图预览与支付引导还可继续优化

## 当前保留交付物

- 最新云托管后端发布包：
  - `/Users/liuxu/Desktop/codex/takeaway-app-backend-cloudhosting-v6.zip`
- 当前项目交接文档：
  - `/Users/liuxu/Desktop/codex/takeaway-app/HANDOFF_2026-03-21.md`
- 当前正式文档目录：
  - `/Users/liuxu/Desktop/codex/takeaway-app/docs`

## 下一步建议

- 修复云托管线上默认图片资源 404
- 切换 SQLite 到 MySQL
- 完善上传后体验版/审核版的合法域名方案
- 增加商家订单筛选与统计
- 增加截图审核记录与操作日志
- 继续优化付款引导与订单详情交互
