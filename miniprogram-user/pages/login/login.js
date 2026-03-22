const app = getApp();

Page({
  data: {
    nickname: "",
    avatarUrl: "",
    submitting: false,
    statusText: "先浏览菜单，登录后可继续下单、管理地址和查看订单。"
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
    this.setData({
      submitting: true,
      statusText: "正在获取微信授权，请稍候..."
    });
    wx.showLoading({ title: "正在登录..." });
    try {
      await app.loginUser("微信用户", "", {});
      const redirect = wx.getStorageSync("login-redirect") || "/pages/index/index";
      wx.removeStorageSync("login-redirect");
      this.setData({ statusText: "登录成功，正在返回上一步..." });
      wx.showToast({ title: "登录成功，开始点餐", icon: "success" });
      setTimeout(() => {
        wx.redirectTo({ url: redirect });
      }, 350);
    } catch (error) {
      const title = error && error.detail ? error.detail : "登录失败";
      this.setData({ statusText: title });
      wx.showToast({ title, icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  }
});
