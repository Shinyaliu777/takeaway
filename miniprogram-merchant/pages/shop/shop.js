const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    form: {
      name: "",
      logo_url: "",
      wechat_qr_url: "",
      alipay_qr_url: "",
      tng_qr_url: "",
      phone: "",
      address: "",
      notice: "",
      business_hours: ""
    },
    uploadKey: ""
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadShop();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadShop() {
    try {
      const shop = await api.getShop();
      this.setData({
        form: {
          name: shop.name || "",
          logo_url: shop.logo_url || "",
          wechat_qr_url: shop.wechat_qr_url || "",
          alipay_qr_url: shop.alipay_qr_url || "",
          tng_qr_url: shop.tng_qr_url || "",
          phone: shop.phone || "",
          address: shop.address || "",
          notice: shop.notice || "",
          business_hours: shop.business_hours || ""
        }
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  chooseUpload(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) {
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          return;
        }
        this.setData({ uploadKey: key });
        try {
          const uploaded = await api.uploadImage(file.tempFilePath);
          this.setData({
            [`form.${key}`]: uploaded.image_url,
            uploadKey: ""
          });
          wx.showToast({ title: "上传成功", icon: "success" });
        } catch (error) {
          this.setData({ uploadKey: "" });
          wx.showToast({ title: "上传失败", icon: "none" });
        }
      }
    });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },
  async saveShop() {
    try {
      await api.updateShop(this.data.form);
      await this.loadShop();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "保存失败", icon: "none" });
    }
  }
});
