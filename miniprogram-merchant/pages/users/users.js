const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    users: []
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadUsers();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadUsers() {
    try {
      const users = await api.getUsers();
      this.setData({ users: users || [] });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  goDetail(event) {
    const userId = Number(event.currentTarget.dataset.id || 0);
    if (!userId) {
      return;
    }
    wx.navigateTo({ url: `/pages/user-detail/user-detail?id=${userId}` });
  }
});
