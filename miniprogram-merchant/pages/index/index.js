const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    tokenReady: false,
    messageCount: 0
  },
  onShow() {
    this.ensureLogin();
  },
  async ensureLogin() {
    try {
      await app.ensureMerchantLogin();
      const messages = await api.getMessages();
      this.setData({
        tokenReady: true,
        messageCount: (messages || []).filter((item) => !item.read).length
      });
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  goOrders() {
    wx.navigateTo({ url: "/pages/orders/orders" });
  },
  goProducts() {
    wx.navigateTo({ url: "/pages/products/products" });
  },
  goCategories() {
    wx.navigateTo({ url: "/pages/categories/categories" });
  },
  goShop() {
    wx.navigateTo({ url: "/pages/shop/shop" });
  },
  goMessages() {
    wx.navigateTo({ url: "/pages/messages/messages" });
  },
  logout() {
    app.globalData.merchantToken = "";
    wx.removeStorageSync("merchant-token");
    wx.removeStorageSync("merchant-user");
    wx.redirectTo({ url: "/pages/login/login" });
  }
});
