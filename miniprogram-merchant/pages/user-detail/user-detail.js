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

Page({
  data: {
    user: null,
    addresses: [],
    orders: []
  },
  onLoad(query) {
    this.userId = Number(query.id || 0);
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadDetail();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadDetail() {
    try {
      const detail = await api.getUserDetail(this.userId);
      this.setData({
        user: detail.user || null,
        addresses: detail.addresses || [],
        orders: (detail.orders || []).map((item) => ({
          ...item,
          order_status_text: mapOrderStatus(item.order_status)
        }))
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  goOrderDetail(event) {
    const orderId = Number(event.currentTarget.dataset.id || 0);
    if (!orderId) {
      return;
    }
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
  }
});
