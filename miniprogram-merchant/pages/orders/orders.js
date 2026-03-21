const api = require("../../utils/request");
const app = getApp();

function mapOrderStatus(status) {
  return {
    PENDING_PAYMENT: "待支付",
    PAYMENT_REVIEW: "待审核截图",
    PAID: "已付款",
    DELIVERING: "配送中",
    COMPLETED: "已完成"
  }[status] || status;
}

function mapPaymentStatus(status) {
  return {
    UNPAID: "未支付",
    PROOF_UPLOADED: "待确认",
    SUCCESS: "支付成功",
    FAILED: "已退回"
  }[status] || status;
}

Page({
  data: {
    orders: []
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadOrders();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadOrders() {
    try {
      const orders = await api.getOrders();
      const mapped = (orders || []).map((item) => ({
        ...item,
        order_status_text: mapOrderStatus(item.order_status),
        payment_status_text: mapPaymentStatus(item.payment_status)
      }));
      this.setData({ orders: mapped });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },
  async updateStatus(event) {
    const { id, status } = event.currentTarget.dataset;
    try {
      await api.updateOrder(id, { order_status: status });
      this.loadOrders();
      wx.showToast({ title: "已更新", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "更新失败", icon: "none" });
    }
  }
});
