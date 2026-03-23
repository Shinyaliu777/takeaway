const api = require("../../utils/request");
const cloud = require("../../utils/cloud");
const app = getApp();
const SOFT_COMPRESS_THRESHOLD_BYTES = 1024 * 1024;
const HARD_REJECT_THRESHOLD_BYTES = 8 * 1024 * 1024;

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

function buildUploadGuide(order) {
  if (!order) {
    return {
      uploadGuideText: "",
      uploadGuideSubText: ""
    };
  }
  if (order.payment_status === "FAILED") {
    return {
      uploadGuideText: "上次截图未通过，请重新上传清晰截图。",
      uploadGuideSubText: "系统会在上传中显示实时进度，图片较大时会先自动优化。"
    };
  }
  if (order.payment_status === "PROOF_UPLOADED") {
    return {
      uploadGuideText: "截图已提交，正在等待商家确认。",
      uploadGuideSubText: "如果商家退回截图，这里会提示你重新上传。"
    };
  }
  if (order.payment_status === "UNPAID") {
    return {
      uploadGuideText: "先完成转账，再上传付款截图。",
      uploadGuideSubText: "系统会在上传中显示实时进度，图片较大时会先自动优化。"
    };
  }
  return {
    uploadGuideText: "",
    uploadGuideSubText: ""
  };
}

function formatUploadError(error) {
  if (!error) {
    return "提交失败，请稍后重试";
  }
  const detail = String(error.detail || error.message || "").trim();
  if (detail) {
    return detail;
  }
  if (String(error.errMsg || "").includes("abort")) {
    return "上传已中断，请重新选择截图再试";
  }
  return "提交失败，请稍后重试";
}

function compressProofIfNeeded(file) {
  return new Promise((resolve) => {
    const size = Number((file && file.size) || 0);
    const tempFilePath = (file && file.tempFilePath) || "";
    if (!tempFilePath || !size || size <= SOFT_COMPRESS_THRESHOLD_BYTES) {
      resolve(file);
      return;
    }
    wx.compressImage({
      src: tempFilePath,
      quality: 78,
      success(res) {
        resolve({
          ...file,
          tempFilePath: res.tempFilePath || tempFilePath
        });
      },
      fail() {
        resolve(file);
      }
    });
  });
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
    uploadProgress: 0,
    uploadStatusText: "",
    uploadErrorText: "",
    uploadGuideText: "",
    uploadGuideSubText: "",
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
      const uploadGuide = buildUploadGuide(detail.order);
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
        uploadGuideText: uploadGuide.uploadGuideText,
        uploadGuideSubText: uploadGuide.uploadGuideSubText,
        items: (detail.items || []).map((item) => ({
          ...item,
          selected_options_text: formatSelectedOptions(item.selected_options || [])
        })),
        payment,
        proofImageFailed: false,
        uploadProgress: 0,
        uploadStatusText: "",
        uploadErrorText: ""
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
    if (this.data.uploading) {
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        let file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({
          uploadErrorText: "",
          uploadStatusText: "正在检查截图大小..."
        });
        if ((file.size || 0) > HARD_REJECT_THRESHOLD_BYTES) {
          const errorText = "图片过大，请换一张更小的截图";
          this.setData({
            uploadStatusText: "",
            uploadErrorText: errorText
          });
          wx.showToast({ title: errorText, icon: "none" });
          return;
        }
        if ((file.size || 0) > SOFT_COMPRESS_THRESHOLD_BYTES) {
          this.setData({ uploadStatusText: "图片较大，正在自动优化..." });
          wx.showLoading({ title: "正在优化图片..." });
          file = await compressProofIfNeeded(file);
          wx.hideLoading();
          this.setData({ uploadStatusText: "图片已优化，准备上传..." });
        }
        this.setData({
          uploading: true,
          uploadProgress: 0,
          uploadStatusText: "正在上传截图...",
          uploadErrorText: ""
        });
        wx.showLoading({ title: "正在上传..." });
        try {
          const uploadResult = await api.uploadPaymentProof(file.tempFilePath, {
            onProgress: (progress) => {
              const percent = Math.max(0, Math.min(99, Number(progress.progress || 0)));
              this.setData({
                uploadProgress: percent,
                uploadStatusText: percent >= 99 ? "上传已接近完成，正在提交凭证..." : `正在上传截图 ${percent}%`
              });
            }
          });
          this.setData({
            uploadProgress: 100,
            uploadStatusText: "图片已上传，正在提交凭证..."
          });
          await api.submitPaymentProof(this.orderId, {
            proof_image_url: uploadResult.image_url || ""
          });
          wx.hideLoading();
          await this.loadDetail();
          this.setData({
            uploadProgress: 0,
            uploadStatusText: "",
            uploadErrorText: ""
          });
          wx.showToast({ title: "截图已提交，等待商家确认", icon: "success" });
        } catch (error) {
          const detail = formatUploadError(error);
          wx.hideLoading();
          this.setData({
            uploadProgress: 0,
            uploadStatusText: "",
            uploadErrorText: detail
          });
          if (String(detail || "").includes("图片过大")) {
            this.setData({
              uploadGuideText: "图片太大了，换一张更小的截图再试。",
              uploadGuideSubText: "系统仍会在上传前尝试自动优化。"
            });
          }
          wx.showToast({ title: detail, icon: "none" });
        } finally {
          this.setData({
            uploading: false
          });
        }
      }
    });
  }
});
