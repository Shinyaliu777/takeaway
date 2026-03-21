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

function formatSelectedOptions(selectedOptions) {
  return (selectedOptions || []).map((item) => `${item.group_name}:${item.option_name}`).join(" / ");
}

Page({
  data: {
    order: null,
    items: [],
    payment: null,
    uploading: false,
    proofImageFailed: false
  },
  onLoad(query) {
    this.orderId = query.id;
  },
  async onShow() {
    try {
      await app.ensureUserLogin(wx.getStorageSync("user-nickname") || "微信用户");
      this.loadDetail();
    } catch (error) {
      wx.setStorageSync("login-redirect", `/pages/order-detail/order-detail?id=${this.orderId}`);
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
        payment: detail.payment && detail.payment.proof_image_url
          ? {
              ...detail.payment,
              proof_image_url: `${detail.payment.proof_image_url}${detail.payment.proof_image_url.indexOf("?") > -1 ? "&" : "?"}t=${Date.now()}`
            }
          : (detail.payment || null),
        proofImageFailed: false
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  handleProofError() {
    this.setData({ proofImageFailed: true });
  },
  previewProofImage() {
    const payment = this.data.payment || {};
    if (!payment.proof_image_url) {
      return;
    }
    const current = payment.proof_image_url.split("?")[0];
    wx.previewImage({
      current,
      urls: [current]
    });
  },
  choosePaymentProof() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({ uploading: true });
        try {
          const uploadResult = await api.uploadPaymentProof(file.tempFilePath);
          await api.submitPaymentProof(this.orderId, {
            proof_image_url: uploadResult.image_url
          });
          wx.showToast({ title: "截图已提交", icon: "success" });
          await this.loadDetail();
        } catch (error) {
          const detail = error && error.detail ? error.detail : "";
          wx.showToast({ title: detail || "提交失败", icon: "none" });
        } finally {
          this.setData({ uploading: false });
        }
      }
    });
  }
});
