const api = require("../../utils/request");
const app = getApp();

function isToday(timestamp) {
  if (!timestamp) {
    return false;
  }
  const date = new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

Page({
  data: {
    tokenReady: false,
    messageCount: 0,
    pendingOrders: 0,
    reviewCount: 0,
    featuredEnabled: false,
    userCount: 0,
    todayNewUsers: 0,
    todayOrderCount: 0,
    todayRevenue: "0.00",
    deliveringCount: 0,
    activeRuleCount: 0
  },
  onShow() {
    this.ensureLogin();
  },
  async ensureLogin() {
    try {
      await app.ensureMerchantLogin();
      const [messages, orders, shop, users, rules] = await Promise.all([
        api.getMessages(),
        api.getOrders(),
        api.getShop(),
        api.getUsers(),
        api.getComboRules()
      ]);
      const todaysOrders = (orders || []).filter((item) => isToday(item.created_at));
      const todaysUsers = (users || []).filter((item) => isToday(item.created_at));
      const todayRevenue = todaysOrders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      this.setData({
        tokenReady: true,
        messageCount: (messages || []).filter((item) => !item.read).length,
        pendingOrders: (orders || []).filter((item) => item.order_status === "PAID" || item.order_status === "PAYMENT_REVIEW").length,
        reviewCount: (orders || []).filter((item) => item.payment_status === "PROOF_UPLOADED").length,
        featuredEnabled: !!(shop && shop.featured_enabled),
        userCount: (users || []).length,
        todayNewUsers: todaysUsers.length,
        todayOrderCount: todaysOrders.length,
        todayRevenue: todayRevenue.toFixed(2),
        deliveringCount: (orders || []).filter((item) => item.order_status === "DELIVERING").length,
        activeRuleCount: (rules || []).filter((item) => item.enabled !== false).length
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
  goRules() {
    wx.navigateTo({ url: "/pages/rules/rules" });
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
