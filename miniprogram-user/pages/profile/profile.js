const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    profile: {},
    nickname: "",
    avatarUrl: "",
    mobile: "",
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
        mobile: profile.mobile || "",
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
    const key = event.currentTarget.dataset.key || "nickname";
    this.setData({ [key]: event.detail.value });
  },
  onChooseAvatar(event) {
    this.setData({
      avatarUrl: event.detail.avatarUrl || ""
    });
  },
  async saveProfile() {
    try {
      const profile = await api.updateUserProfile({
        nickname: this.data.nickname || "微信用户",
        avatar_url: this.data.avatarUrl || "",
        mobile: this.data.mobile || ""
      });
      app.globalData.userInfo = profile || null;
      wx.setStorageSync("user-info", profile || null);
      wx.setStorageSync("user-nickname", (profile && profile.nickname) || "微信用户");
      this.loadProfile();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "保存失败", icon: "none" });
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
