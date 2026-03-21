const app = getApp();

Page({
  data: {
    nickname: "",
    avatarUrl: "",
    submitting: false
  },
  onShow() {
    if (app.globalData.userToken) {
      const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
      wx.removeStorageSync("login-redirect");
      wx.redirectTo({ url: redirect });
    }
  },
  async submitLogin() {
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    try {
      await app.loginUser("微信用户", "", {});
      const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
      wx.removeStorageSync("login-redirect");
      wx.redirectTo({ url: redirect });
    } catch (error) {
      const title = error && error.detail ? error.detail : "登录失败";
      wx.showToast({ title, icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
