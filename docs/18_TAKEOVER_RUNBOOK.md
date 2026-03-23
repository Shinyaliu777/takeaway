# 接手 Runbook

更新时间：2026-03-23

这份文档假设你是**今天第一次接手**这个项目。

目标不是理解全部历史，而是：

1. 跑起来
2. 找到线上资源
3. 能排查问题
4. 能发布

## 1. 第一天先做什么

### 第一步：确认目录
- 根目录：`/Users/liuxu/Desktop/codex/takeaway-app`

### 第二步：先读这几份文档
1. [07 项目交接](/Users/liuxu/Desktop/codex/takeaway-app/docs/07_HANDOFF.md)
2. [16 资源地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/16_RESOURCE_MAP.md)
3. [17 模块地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/17_MODULE_GUIDE.md)
4. [08 运维与发布](/Users/liuxu/Desktop/codex/takeaway-app/docs/08_OPERATIONS.md)

### 第三步：确认线上入口
- API：`https://takeaway-api-236333-9-1413277342.sh.run.tcloudbase.com`
- MySQL：看 [16 资源地图](/Users/liuxu/Desktop/codex/takeaway-app/docs/16_RESOURCE_MAP.md)

## 2. 本地怎么启动

### 后端
- 目录：`/Users/liuxu/Desktop/codex/takeaway-app/backend`
- 入口：[main.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/main.py)
- 启动脚本：[start_backend.sh](/Users/liuxu/Desktop/codex/takeaway-app/backend/start_backend.sh)

### 用户端
- 工程目录：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-user`
- 用微信开发者工具打开

### 商家端
- 工程目录：`/Users/liuxu/Desktop/codex/takeaway-app/miniprogram-merchant`
- 用微信开发者工具打开

## 3. 当前推荐的联调顺序

### 用户端
1. 首页菜单能否加载
2. 首页付款方式弹层能否显示
3. 登录是否正常
4. 购物车是否能创建订单
5. 订单详情是否能上传付款截图

### 商家端
1. 登录是否正常
2. 首页工作台是否正常
3. 订单详情是否能看付款截图
4. 商家确认付款是否正常
5. 店铺设置上传收款码后，用户端是否能看到

## 4. 当前最重要的线上排查经验

### 经验 1：GitHub 最新不等于云托管最新
- 已 push 到 `main`，线上实例未必已经切到最新 revision
- 线上行为异常时，优先：
  - 看运行日志
  - 手动重启 `takeaway-api`

### 经验 2：历史 `/uploads/...` 图片很脆
- 历史收款码和付款截图可能指向失效文件
- 遇到图片 404，不要只看数据库有无 URL，要直接访问 URL 确认

### 经验 3：先看真实异常 detail
- `/api/orders/create` 曾经的线上 500 最后真实原因是：
  - `uuid4` 未导入
- 所以不要一开始就猜数据库结构问题
- 先把后端异常 detail 打出来，再判断

### 经验 4：开发者工具缓存会误导你
- 代码已经改了，但开发者工具仍可能运行旧 bundle
- 看到“仓库里没有的旧路径”时，优先清缓存并重编

## 5. 当前已知可用测试入口

- 商家端测试账号：`admin / admin123`
- 用户端当前缓存用户：`id=2`
- 常用测试地址：
  - 收件人：`11`
  - 电话：`121`
  - 地址：`123`

更完整测试数据见：
- [13 合规测试数据指引](/Users/liuxu/Desktop/codex/takeaway-app/docs/13_TEST_DATA_GUIDE.md)
- [15 线上联调测试数据清单](/Users/liuxu/Desktop/codex/takeaway-app/docs/15_LIVE_TEST_DATA_CHECKLIST.md)

## 6. 发布前最低检查

### 后端
- 本地语法检查
- 关键接口至少跑一遍：
  - `/health`
  - `/api/shop`
  - `/api/orders/create`

### 用户端
- 首页付款方式
- 创建订单
- 上传付款截图

### 商家端
- 查看付款截图
- 确认付款
- 上传收款码

## 7. 接手人不要做的事

- 不要把真实密码、AppSecret、长期 Token 写进 GitHub
- 不要默认认为 500 一定是数据库问题
- 不要忽略微信开发者工具缓存
- 不要在没确认线上 revision 的情况下断言“代码没生效”

## 8. 如果只剩 30 分钟，你至少要确认

1. 知道项目根目录在哪
2. 知道 API 地址和 MySQL 入口在哪
3. 知道用户端和商家端各自用哪个目录打开
4. 知道最关键的线上问题目前集中在：
   - 首页付款方式
   - 创建订单
   - 付款截图与收款码
5. 知道文档总入口是 [docs/README.md](/Users/liuxu/Desktop/codex/takeaway-app/docs/README.md)
