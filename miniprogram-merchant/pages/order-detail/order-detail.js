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

function formatSelectedOptions(selectedOptions) {
  return (selectedOptions || []).map((item) => `${item.group_name}:${item.option_name}`).join(" / ");
}

Page({
  data: {
    order: null,
    items: [],
    payment: null
  },
  onLoad(query) {
    this.orderId = query.id;
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
      const detail = await api.getOrderDetail(this.orderId);
      this.setData({
        order: detail.order
          ? {
              ...detail.order,
              order_status_text: mapOrderStatus(detail.order.order_status),
              payment_status_text: mapPaymentStatus(detail.order.payment_status)
            }
          : null,
        items: (detail.items || []).map((item) => ({
          ...item,
          selected_options_text: formatSelectedOptions(item.selected_options || [])
        })),
        payment: detail.payment || null
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  async confirmPayment() {
    try {
      await api.confirmPayment(this.orderId);
      wx.showToast({ title: "已确认到账", icon: "success" });
      this.loadDetail();
    } catch (error) {
      wx.showToast({ title: "确认失败", icon: "none" });
    }
  },
  async rejectPayment() {
    try {
      await api.rejectPayment(this.orderId);
      wx.showToast({ title: "已退回用户", icon: "success" });
      this.loadDetail();
    } catch (error) {
      wx.showToast({ title: "退回失败", icon: "none" });
    }
  }
});
