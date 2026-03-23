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
