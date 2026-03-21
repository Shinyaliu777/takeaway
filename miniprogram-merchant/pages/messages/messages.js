const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    messages: []
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadMessages();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadMessages() {
    try {
      const messages = await api.getMessages();
      this.setData({ messages });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  async markRead(event) {
    try {
      await api.readMessage(event.currentTarget.dataset.id);
      this.loadMessages();
      wx.showToast({ title: "已标记", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  }
});
