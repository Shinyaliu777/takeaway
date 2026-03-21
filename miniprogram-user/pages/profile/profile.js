const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    profile: {},
    nickname: "",
    avatarUrl: "",
    stats: []
  },
  onShow() {
    this.loadProfile();
  },
  async loadProfile() {
    try {
      await app.ensureUserLogin(wx.getStorageSync("user-nickname") || "微信用户");
      const profile = await api.getUserProfile();
      this.setData({
        profile,
        nickname: profile.nickname || "",
        avatarUrl: profile.avatar_url || "",
        stats: [
          { label: "账号状态", value: "已登录" },
          { label: "地址管理", value: "多地址" },
          { label: "订单服务", value: "实时状态" }
        ]
      });
    } catch (error) {
      this.setData({ profile: {}, nickname: "", stats: [] });
    }
  },
  onInput(event) {
    this.setData({ nickname: event.detail.value });
  },
  onChooseAvatar(event) {
    this.setData({
      avatarUrl: event.detail.avatarUrl || ""
    });
  },
  async saveProfile() {
    try {
      await app.loginUser(this.data.nickname || "微信用户", this.data.avatarUrl || "");
      this.loadProfile();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({
        title: error && error.detail === "WeChat login is not configured" ? "后端未配置微信登录" : "保存失败",
        icon: "none"
      });
    }
  },
  goAddresses() {
    wx.navigateTo({ url: "/pages/address/address" });
  },
  goOrders() {
    wx.navigateTo({ url: "/pages/orders/orders" });
  },
  goMessages() {
    wx.navigateTo({ url: "/pages/messages/messages" });
  },
  goLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },
  logout() {
    app.logoutUser();
    this.setData({ profile: {}, nickname: "", stats: [] });
    wx.showToast({ title: "已退出", icon: "success" });
  }
});
