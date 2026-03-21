const app = getApp();

Page({
  data: {
    nickname: "",
    avatarUrl: ""
  },
  onShow() {
    if (app.globalData.userToken) {
      const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
      wx.removeStorageSync("login-redirect");
      wx.redirectTo({ url: redirect });
    }
  },
  submitLogin() {
    app
      .loginUser("微信用户", "", {})
      .then(() => {
        const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
        wx.removeStorageSync("login-redirect");
        wx.redirectTo({ url: redirect });
      })
      .catch((error) => {
        const title = error && error.detail ? error.detail : "登录失败";
        wx.showToast({ title, icon: "none" });
      });
  }
});
