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
      business_hours: "",
      extra_rice_price: "2",
      featured_enabled: false,
      featured_cards_json: "[]"
    },
    uploadKey: "",
    featuredCards: []
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
          business_hours: shop.business_hours || "",
          extra_rice_price: `${shop.extra_rice_price !== undefined ? shop.extra_rice_price : 2}`,
          featured_enabled: !!shop.featured_enabled,
          featured_cards_json: shop.featured_cards_json || "[]"
        },
        featuredCards: (shop.featured_cards || []).length
          ? shop.featured_cards
          : [
              { title: "", subtitle: "", image_url: "", target_product_id: "" },
              { title: "", subtitle: "", image_url: "", target_product_id: "" },
              { title: "", subtitle: "", image_url: "", target_product_id: "" }
            ]
      });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  chooseUpload(event) {
    const key = event.currentTarget.dataset.key;
    const index = event.currentTarget.dataset.index;
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
          if (index !== undefined && index !== null && index !== "") {
            this.setData({
              [`featuredCards[${Number(index)}].${key}`]: uploaded.image_url,
              uploadKey: ""
            });
          } else {
            this.setData({
              [`form.${key}`]: uploaded.image_url,
              uploadKey: ""
            });
          }
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
  onFeaturedInput(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`featuredCards[${index}].${key}`]: event.detail.value
    });
  },
  onFeaturedSwitch(event) {
    this.setData({
      "form.featured_enabled": !!event.detail.value
    });
  },
  async saveShop() {
    try {
      await api.updateShop({
        ...this.data.form,
        extra_rice_price: Number(this.data.form.extra_rice_price || 0),
        featured_cards_json: JSON.stringify(this.data.featuredCards || [])
      });
      await this.loadShop();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "保存失败", icon: "none" });
    }
  }
});
