const api = require("../../utils/request");
const app = getApp();

function mapOrderStatus(status) {
  return {
    PENDING_PAYMENT: "待支付",
    PAYMENT_REVIEW: "待商家确认",
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
    FAILED: "支付未通过"
  }[status] || status;
}

Page({
  data: {
    orders: [],
    isGuest: true
  },
  async onShow() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    if (!token) {
      this.setData({
        isGuest: true,
        orders: []
      });
      return;
    }
    app.globalData.userToken = token;
    this.setData({ isGuest: false });
    this.loadOrders();
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
  goLogin() {
    wx.setStorageSync("login-redirect", "/pages/orders/orders");
    wx.navigateTo({ url: "/pages/login/login" });
  }
});
