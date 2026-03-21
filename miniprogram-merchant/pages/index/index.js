const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    tokenReady: false,
    messageCount: 0,
    pendingOrders: 0,
    reviewCount: 0,
    featuredEnabled: false,
    userCount: 0
  },
  onShow() {
    this.ensureLogin();
  },
  async ensureLogin() {
    try {
      await app.ensureMerchantLogin();
      const [messages, orders, shop, users] = await Promise.all([
        api.getMessages(),
        api.getOrders(),
        api.getShop(),
        api.getUsers()
      ]);
      this.setData({
        tokenReady: true,
        messageCount: (messages || []).filter((item) => !item.read).length,
        pendingOrders: (orders || []).filter((item) => item.order_status === "PAID" || item.order_status === "PAYMENT_REVIEW").length,
        reviewCount: (orders || []).filter((item) => item.payment_status === "PROOF_UPLOADED").length,
        featuredEnabled: !!(shop && shop.featured_enabled),
        userCount: (users || []).length
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
  goUsers() {
    wx.navigateTo({ url: "/pages/users/users" });
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
