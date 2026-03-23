# 项目交接

更新时间：2026-03-23

## 1. 当前结论

项目已经不是 demo，而是一个已上线的、可运营的双端微信小程序系统，包含：

- 用户端小程序
- 商家端小程序
- 微信云托管 FastAPI 后端
- 微信云托管 MySQL
- 套餐规则后台化
- 付款截图上传与商家审核

## 2. 当前真实状态

截至 2026-03-23，当前主线已包含以下关键事实：

- 用户端支持先浏览，再在关键动作前登录
- 用户端以“具体菜品选购”替代“固定套餐商品”
- 系统自动按荤素数量拆分最优套餐
- 套餐默认含 1 份米饭，额外米饭单独计价
- 必须能完整组成套餐才能下单
- 支付流程仍为“线下转账 + 上传截图 + 商家审核”
- 用户端首页已补回付款方式入口，并增加收款码兜底
- 购物车和订单详情都已补“查看付款方式”回跳
- 商家端已具备商品、分类、规则、店铺、订单审核、用户管理等能力
- 云托管线上行为偶尔会滞后于 GitHub 最新提交，排查时要优先确认当前运行 revision

## 3. 关键地址

- 项目目录：`/Users/liuxu/Desktop/codex/takeaway-app`
- 线上 API：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`
- GitHub 仓库：[https://github.com/Shinyaliu777/takeaway](https://github.com/Shinyaliu777/takeaway)

## 4. 第一次接手建议阅读顺序

1. [16 资源地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/16_RESOURCE_MAP.md)
2. [17 模块地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/17_MODULE_GUIDE.md)
3. [18 接手 Runbook](/Users/liuxu/Desktop/codex/takeaway-app/docs/18_TAKEOVER_RUNBOOK.md)
4. [03 接口说明](/Users/liuxu/Desktop/codex/takeaway-app/docs/03_API_REFERENCE.md)
5. [08 运维与发布](/Users/liuxu/Desktop/codex/takeaway-app/docs/08_OPERATIONS.md)

## 5. 当前测试账号

- 商家端：`admin / admin123`

说明：
- 这是当前项目里已知的测试商家账号
- 真实生产凭据不要写进 GitHub

## 6. 当前重点风险

### 云托管实例状态
- GitHub 已 push 不代表线上已经切到最新代码
- 出现“本地能复现，线上行为不一致”时，先确认云托管 revision，再手动重启服务

### 历史 `/uploads/...` 图片
- 旧收款码、旧付款截图曾出现文件丢失
- 新链路优先走小程序云环境和新的前端兜底
- 仍需警惕数据库里残留旧 URL

### 后端结构
- 接口大部分仍集中在 [routes.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/api/routes.py)
- schema 迁移不是 Alembic，而是 [session.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/db/session.py) 补列

## 7. 交接给下一个人的最低要求

至少要让下一个人知道：

- 线上资源入口在哪
- 本地三个端分别从哪启动
- 小程序配置在哪改
- 数据库去哪查
- 日志去哪看
- 当前最关键的联调测试数据是什么

这些已经在下面几份文档里补齐：

- [16 资源地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/16_RESOURCE_MAP.md)
- [17 模块地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/17_MODULE_GUIDE.md)
- [18 接手 Runbook](/Users/liuxu/Desktop/codex/takeaway-app/docs/18_TAKEOVER_RUNBOOK.md)
- [15 线上联调测试数据清单](/Users/liuxu/Desktop/codex/takeaway-app/docs/15_LIVE_TEST_DATA_CHECKLIST.md)

## 8. 文档维护原则

- 当前事实以代码和本目录 Markdown 为准
- 历史 `.docx` 仅保留参考
- 任何真实密码、AppSecret、数据库长期凭据都不要写进 GitHub 文档

## 9. 建议接手团队配置

### 最少配置：2 人

适合：
- 先救火
- 先维持上线
- 需求不多、以修线上问题为主

建议分工：
- `1 名全栈 / 后端主负责人`
  - 负责云托管
  - 负责 MySQL
  - 负责接口
  - 负责商家端和用户端联调闭环
- `1 名前端 / 小程序负责人`
  - 负责用户端
  - 负责商家端页面
  - 负责微信开发者工具、真机验证和发布前回归

### 推荐配置：3 人

这是当前项目最合适的接手方式。

建议分工：
- `1 名后端负责人`
  - 负责 FastAPI、订单状态流、图片上传、数据库和云托管
- `1 名用户端负责人`
  - 负责用户端点餐、购物车、订单详情、登录链路、付款方式
- `1 名商家端负责人`
  - 负责工作台、订单审核、商品、规则、店铺设置、收款码上传

优点：
- 用户端和商家端不会互相抢同一套页面
- 后端能专心盯接口、日志、数据库和部署
- 最适合当前“线上已运行、还在持续修链路”的状态

### 更稳配置：4 人

适合：
- 要持续迭代
- 既要修线上问题，也要推进产品体验和新需求

建议分工：
- `1 名后端负责人`
- `1 名用户端小程序负责人`
- `1 名商家端小程序负责人`
- `1 名产品 / 测试 / 运营联调负责人`

第四个人重点负责：
- 用真实测试数据走主链路
- 验证回归
- 记录线上问题
- 跟进发布 checklist

## 10. 当前最推荐的职责划分

如果现在真的要交给下一批人接手，建议按下面切：

- `A 角色：后端与运维`
  - 文件范围：
    - [backend/app/api/routes.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/api/routes.py)
    - [backend/app/services/order_flow.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/order_flow.py)
    - [backend/app/services/storage.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/storage.py)
    - [backend/app/db/session.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/db/session.py)
  - 资源范围：
    - 云托管
    - MySQL
    - 日志

- `B 角色：用户端`
  - 文件范围：
    - [miniprogram-user/pages/index/index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/index/index.js)
    - [miniprogram-user/pages/cart/cart.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/cart/cart.js)
    - [miniprogram-user/pages/order-detail/order-detail.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/order-detail/order-detail.js)
    - [miniprogram-user/pages/login/login.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user/pages/login/login.js)
  - 业务范围：
    - 菜单
    - 购物车
    - 下单
    - 上传付款截图
    - 付款方式展示

- `C 角色：商家端`
  - 文件范围：
    - [miniprogram-merchant/pages/index/index.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/index/index.js)
    - [miniprogram-merchant/pages/orders/orders.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/orders/orders.js)
    - [miniprogram-merchant/pages/order-detail/order-detail.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/order-detail/order-detail.js)
    - [miniprogram-merchant/pages/shop/shop.js](/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant/pages/shop/shop.js)
  - 业务范围：
    - 审核付款
    - 商品与规则
    - 收款码与店铺设置

- `D 角色：测试 / 产品验收`
  - 文档范围：
    - [docs/15_LIVE_TEST_DATA_CHECKLIST.md](/Users/liuxu/Desktop/codex/takeaway-app/docs/15_LIVE_TEST_DATA_CHECKLIST.md)
    - [docs/13_TEST_DATA_GUIDE.md](/Users/liuxu/Desktop/codex/takeaway-app/docs/13_TEST_DATA_GUIDE.md)
    - [docs/08_OPERATIONS.md](/Users/liuxu/Desktop/codex/takeaway-app/docs/08_OPERATIONS.md)
  - 工作范围：
    - 跑回归
    - 记问题
    - 做发布前确认
