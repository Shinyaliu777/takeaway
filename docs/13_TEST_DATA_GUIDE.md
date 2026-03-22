# 合规测试数据指引

更新时间：2026-03-22  
项目目录：`/Users/liuxu/Desktop/codex/takeaway-app`

## 1. 目的

本文件用于统一项目在以下场景中的测试数据口径：

- 微信小程序审核演示
- 本地联调
- 云端联调
- 功能回归测试

原则：

- 一律使用虚构用户、虚构地址、虚构订单
- 不使用真实姓名、真实手机号、真实付款截图
- 不使用任何可回溯到真实个人的信息

## 2. 测试账号

### 商家端

- 用户名：`admin`
- 密码：`admin123`
- 用途：商家后台功能演示与审核

说明：

- 如果对外提交审核，建议在审核备注中明确该账号仅用于审核体验
- 如上线后继续保留，建议另行修改为强密码

## 3. 用户侧合规测试数据

### 测试用户 1

- 昵称：`测试用户A`
- 手机号：`+60 11-1000 0001`
- 地址：`Demo Block A, Test Street 1, Kuala Lumpur`

### 测试用户 2

- 昵称：`测试用户B`
- 手机号：`+60 11-1000 0002`
- 地址：`Demo Block B, Test Street 2, Kuala Lumpur`

### 测试用户 3

- 昵称：`回头客测试用户`
- 手机号：`+60 11-1000 0003`
- 地址：`Demo Residence C-08-03, Test Garden, Kuala Lumpur`

说明：

- 手机号仅用于界面演示和订单流测试，不应真实可用
- 地址仅用于配送信息展示，不应指向真实住址

## 4. 订单测试数据建议

建议至少准备以下 5 类订单状态：

### A. 待支付订单

- 订单号示例：`ORD-DEMO-PENDING-001`
- `order_status = PENDING_PAYMENT`
- `payment_status = UNPAID`
- 用途：验证用户上传付款截图前状态、商家端不应出现配送按钮

### B. 待审核截图订单

- 订单号示例：`ORD-DEMO-REVIEW-001`
- `order_status = PAYMENT_REVIEW`
- `payment_status = PROOF_UPLOADED`
- 用途：验证用户端等待审核状态、商家端确认/退回操作

### C. 已付款待配送订单

- 订单号示例：`ORD-DEMO-PAID-001`
- `order_status = PAID`
- `payment_status = SUCCESS`
- 用途：验证商家端“配送中”按钮与待配送统计

### D. 配送中订单

- 订单号示例：`ORD-DEMO-DELIVERING-001`
- `order_status = DELIVERING`
- `payment_status = SUCCESS`
- 用途：验证用户端配送中状态、商家端“已完成”按钮

### E. 已完成订单

- 订单号示例：`ORD-DEMO-COMPLETED-001`
- `order_status = COMPLETED`
- `payment_status = SUCCESS`
- 用途：验证历史订单、用户消息、商家后台统计

## 5. 付款截图测试数据要求

付款截图必须满足：

- 使用演示图片，不使用真实银行或真实账户截图
- 不出现真实姓名
- 不出现真实银行卡号、真实账号、真实付款记录
- 可使用统一样板图，例如：
  - `payment-proof-demo-1.jpg`
  - `payment-proof-demo-2.jpg`

建议在图片中仅保留：

- `Demo Transfer`
- `MYR 18.80`
- `2026-03-22 20:00`
- `Reference: TEST-001`

## 6. 审核演示数据建议

提交微信审核时，建议准备：

- 1 个待支付订单
- 1 个待审核截图订单
- 1 个已付款待配送订单
- 1 个配送中订单
- 1 个已完成订单

这样可以一次覆盖：

- 用户下单路径
- 付款截图上传路径
- 商家审核路径
- 商家配送路径
- 用户订单状态展示路径

## 7. 数据一致性要求

测试数据必须满足以下约束：

- `PENDING_PAYMENT` 只能对应 `UNPAID` 或 `FAILED`
- `PAYMENT_REVIEW` 只能对应 `PROOF_UPLOADED`
- `PAID` 必须对应 `SUCCESS`
- `DELIVERING` 必须对应 `SUCCESS`
- `COMPLETED` 必须对应 `SUCCESS`

不应出现：

- `order_status = PAID` 且 `payment_status != SUCCESS`
- `order_status = DELIVERING` 且 `payment_status != SUCCESS`
- `order_status = COMPLETED` 且 `payment_status != SUCCESS`

## 8. 发布前建议

发布前建议检查：

- 审核演示数据是否全部为虚构数据
- 是否仍残留真实手机号、真实地址、真实截图
- 商家端统计是否与测试订单状态一致
- 用户端状态文案是否与订单数据一致

## 9. 当前仓库现状

当前项目的初始化种子数据已经包含基础演示订单，见：

- [bootstrap.py](/Users/liuxu/Desktop/codex/takeaway-app/backend/app/services/bootstrap.py)

后续如需补更多审核演示数据，建议遵循本文件中的虚构数据格式，不要直接写入真实业务数据。
