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
      const profile = await app.requestUserAuthorization();
      await app.loginUser(profile.nickname, profile.avatarUrl, {});
        const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
        wx.removeStorageSync("login-redirect");
        wx.redirectTo({ url: redirect });
    } catch (error) {
      const title = error && error.detail ? error.detail : "微信授权失败";
      wx.showToast({ title, icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
