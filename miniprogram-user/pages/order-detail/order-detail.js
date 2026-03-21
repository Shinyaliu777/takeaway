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

function buildOrderTimeline(order) {
  if (!order) {
    return [];
  }
  const steps = [
    {
      key: "created",
      title: "订单已创建",
      desc: "订单已生成，等待你完成付款",
      done: true
    },
    {
      key: "proof",
      title: "上传付款截图",
      desc: order.payment_status === "FAILED" ? "当前截图未通过，请重新上传清晰截图" : "上传截图后，商家才能开始审核",
      done: order.payment_status !== "UNPAID"
    },
    {
      key: "review",
      title: "商家审核中",
      desc: order.payment_status === "PROOF_UPLOADED" ? "截图已提交，商家通常会尽快确认到账" : "商家确认到账后订单会进入已付款",
      done: order.payment_status === "SUCCESS"
    },
    {
      key: "delivery",
      title: "开始配送",
      desc: "商家确认到账后开始配送",
      done: order.order_status === "DELIVERING" || order.order_status === "COMPLETED"
    },
    {
      key: "complete",
      title: "订单完成",
      desc: "配送完成后本单结束",
      done: order.order_status === "COMPLETED"
    }
  ];

  const currentIndex = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    ...step,
    active: currentIndex === -1 ? index === steps.length - 1 : index === currentIndex
  }));
}

Page({
  data: {
    order: null,
    items: [],
    payment: null,
    uploading: false,
    proofImageFailed: false,
    timeline: []
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
        timeline: buildOrderTimeline(detail.order),
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
