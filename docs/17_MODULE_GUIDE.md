# 模块地图

更新时间：2026-03-23

这份文档告诉接手人：**每块功能主要在哪。**

## 1. 系统结构

项目由 3 个主要模块组成：

1. 用户端微信小程序
2. 商家端微信小程序
3. FastAPI 后端

## 2. 用户端模块

目录：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user`

### 首页 / 菜单
- 页面：[pages/index/index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/index/index.js)
- 模板：[pages/index/index.wxml](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/index/index.wxml)
- 样式：[pages/index/index.wxss](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/index/index.wxss)

负责：
- 菜单加载
- 分类筛选
- 时段切换
- 推荐位
- 付款方式弹层
- 首页购物车入口

### 商品详情
- [pages/detail/index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/detail/index.js)

负责：
- 具体菜品查看
- 多选项商品加购

### 购物车 / 确认订单
- [pages/cart/cart.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/cart/cart.js)
- [pages/cart/cart.wxml](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/cart/cart.wxml)

负责：
- 当前组合是否可下单
- 套餐金额核对
- 地址校验
- 创建订单
- 回到付款方式

### 订单详情
- [pages/order-detail/order-detail.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/order-detail/order-detail.js)

负责：
- 展示订单状态
- 上传付款截图
- 查看支付进度

### 登录 / 个人中心 / 地址 / 消息
- 登录：[pages/login/login.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/login/login.js)
- 个人中心：[pages/profile/profile.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/profile/profile.js)
- 地址：[pages/address/address.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/address/address.js)
- 消息：[pages/messages/messages.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/messages/messages.js)

### 用户端公共工具
- 请求层：[utils/request.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/utils/request.js)
- 云文件解析：[utils/cloud.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/utils/cloud.js)
- 套餐预演：[utils/pricing.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/utils/pricing.js)

## 3. 商家端模块

目录：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant`

### 首页工作台
- [pages/index/index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/index/index.js)

负责：
- 待审付款
- 待配送
- 未读消息
- 今日经营概览

### 订单管理
- 列表：[pages/orders/orders.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/orders/orders.js)
- 详情：[pages/order-detail/order-detail.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/order-detail/order-detail.js)

负责：
- 付款审核
- 配送状态推进
- 查看付款截图

### 商品与分类
- 商品：[pages/products/products.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/products/products.js)
- 分类：[pages/categories/categories.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/categories/categories.js)

### 规则管理
- [pages/rules/rules.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/rules/rules.js)

负责：
- 套餐规则增删改
- 套餐预览
- 加饭价格

### 店铺设置
- [pages/shop/shop.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/shop/shop.js)

负责：
- logo
- 收款码
- 推荐位
- 店铺资料
- 营业时间

### 商家端公共工具
- 请求层：[utils/request.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/utils/request.js)
- 云文件解析：[utils/cloud.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/utils/cloud.js)

## 4. 后端模块

目录：`/Users/liuxu/Desktop/codex/takeaway-app/backend/app`

### 路由与接口
- [api/routes.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/api/routes.py)

当前仍是单文件主路由，负责：
- 用户登录
- 商家登录
- 商品分类
- 下单
- 地址
- 消息
- 付款截图上传
- 商家订单审核
- 店铺设置

### 核心状态流转
- [services/order_flow.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/order_flow.py)

负责：
- 提交付款截图
- 商家确认付款
- 商家驳回付款
- 订单状态推进

### 套餐算法
- [services/pricing.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/pricing.py)

负责：
- 荤素组合
- 最优套餐拆分
- 单点和加饭金额

### 初始化与默认数据
- [services/bootstrap.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/bootstrap.py)

### 存储
- [services/storage.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/storage.py)

说明：
- 目前后端仍兼容本地 `uploads/`
- 小程序端当前是“新增写入优先走后端上传接口，历史 `cloud://` 继续兼容解析”

### 数据模型
- [models/entities.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/models/entities.py)

### 数据库与补列
- [db/session.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/db/session.py)

说明：
- 当前不是 Alembic
- 启动时会补 legacy 列

## 5. 当前最容易出问题的模块

- 用户端首页付款方式弹层
- 用户端创建订单
- 用户端订单详情付款截图
- 商家端店铺设置上传图片
- 后端 `routes.py` 中的订单创建流程
- 历史 `/uploads/...` 文件引用
