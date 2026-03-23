const api = require("../../utils/request");
const cloud = require("../../utils/cloud");
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
  const proofSubmitted = order.payment_status === "PROOF_UPLOADED" || order.payment_status === "SUCCESS";
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
      done: proofSubmitted
    },
    {
      key: "review",
      title: order.payment_status === "FAILED" ? "截图未通过" : "商家审核中",
      desc: order.payment_status === "FAILED"
        ? "请重新上传清晰截图后再次提交"
        : (order.payment_status === "PROOF_UPLOADED" ? "截图已提交，等待商家确认到账" : "商家确认到账后订单会进入已付款"),
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

function buildPaymentBanner(order) {
  if (!order) {
    return {
      title: "",
      copy: "",
      nextAction: "",
      tone: "info"
    };
  }
  if (order.payment_status === "FAILED") {
    return {
      title: "截图未通过",
      copy: "请重新上传清晰付款截图，商家会再次审核。",
      nextAction: "重新上传付款截图",
      tone: "danger"
    };
  }
  if (order.payment_status === "PROOF_UPLOADED") {
    return {
      title: "截图已提交",
      copy: "商家正在审核，请耐心等待，不需要重复上传。",
      nextAction: "等待商家确认",
      tone: "info"
    };
  }
  if (order.payment_status === "SUCCESS" && order.order_status === "PAID") {
    return {
      title: "商家已确认到账",
      copy: "订单已进入已付款状态，下一步是商家安排配送。",
      nextAction: "等待开始配送",
      tone: "success"
    };
  }
  if (order.order_status === "DELIVERING") {
    return {
      title: "配送中",
      copy: "商家已确认到账，正在安排配送。",
      nextAction: "等待订单完成",
      tone: "success"
    };
  }
  if (order.order_status === "COMPLETED") {
    return {
      title: "订单已完成",
      copy: "本单已结束，如需联系商家可通过消息页继续沟通。",
      nextAction: "查看历史订单",
      tone: "success"
    };
  }
  return {
    title: "等待付款",
    copy: "请先完成线下转账，再上传付款截图给商家确认。",
    nextAction: "上传付款截图",
    tone: "warning"
  };
}

async function normalizePayment(payment) {
  if (!payment) {
    return null;
  }
  const proofRef = (payment.proof_image_url || "").trim();
  let previewUrl = "";
  if (proofRef) {
    try {
      previewUrl = await cloud.getTempFileURL(proofRef);
    } catch (error) {
      previewUrl = "";
    }
  }
  return {
    ...payment,
    proof_storage_ref: proofRef,
    proof_preview_url: previewUrl
  };
}

Page({
  data: {
    order: null,
    items: [],
    payment: null,
    uploading: false,
    proofImageFailed: false,
    timeline: [],
    paymentBanner: {
      title: "",
      copy: "",
      nextAction: "",
      tone: "info"
    }
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
      const payment = await normalizePayment(detail.payment || null);
      this.setData({
        order: detail.order
          ? {
              ...detail.order,
              order_status_text: mapOrderStatus(detail.order.order_status),
              payment_status_text: mapPaymentStatus(detail.order.payment_status)
            }
          : null,
        timeline: buildOrderTimeline(detail.order),
        paymentBanner: buildPaymentBanner(detail.order),
        items: (detail.items || []).map((item) => ({
          ...item,
          selected_options_text: formatSelectedOptions(item.selected_options || [])
        })),
        payment,
        proofImageFailed: false
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  handleProofError() {
    this.setData({ proofImageFailed: true });
  },
  async previewProofImage() {
    const payment = this.data.payment || {};
    let current = payment.proof_preview_url || "";
    if (!current && payment.proof_storage_ref) {
      try {
        current = await cloud.getTempFileURL(payment.proof_storage_ref);
        if (current) {
          this.setData({
            "payment.proof_preview_url": current
          });
        }
      } catch (error) {
        current = "";
      }
    }
    if (!current) {
      wx.showToast({ title: "当前图片不可预览", icon: "none" });
      return;
    }
    wx.previewImage({
      current,
      urls: [current]
    });
  },
  goPaymentMethods() {
    wx.redirectTo({ url: "/pages/index/index?openPayment=1" });
  },
  choosePaymentProof() {
    const order = this.data.order || {};
    if (!(order.payment_status === "UNPAID" || order.payment_status === "FAILED")) {
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({ uploading: true });
        wx.showLoading({ title: "正在上传..." });
        try {
          const uploadResult = await api.uploadPaymentProof(file.tempFilePath);
          await api.submitPaymentProof(this.orderId, {
            proof_image_url: uploadResult.file_id || uploadResult.image_url
          });
          wx.hideLoading();
          wx.showToast({ title: "截图已提交，等待商家确认", icon: "success" });
          await this.loadDetail();
        } catch (error) {
          const detail = error && error.detail ? error.detail : "";
          wx.hideLoading();
          wx.showToast({ title: detail || "提交失败", icon: "none" });
        } finally {
          this.setData({ uploading: false });
        }
      }
    });
  }
});
