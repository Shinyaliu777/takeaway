const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    messages: [],
    isGuest: true
  },
  async onShow() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    if (!token) {
      this.setData({
        isGuest: true,
        messages: []
      });
      return;
    }
    app.globalData.userToken = token;
    this.setData({ isGuest: false });
    this.loadMessages();
  },
  async loadMessages() {
    try {
      const messages = await api.getMessages();
      this.setData({ messages: messages || [] });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  async markRead(event) {
    try {
      await api.readMessage(event.currentTarget.dataset.id);
      this.loadMessages();
    } catch (error) {
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  },
  goLogin() {
    wx.setStorageSync("login-redirect", "/pages/messages/messages");
    wx.navigateTo({ url: "/pages/login/login" });
  }
});
