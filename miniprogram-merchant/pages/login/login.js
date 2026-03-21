const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    username: "admin",
    password: "admin123",
    submitting: false
  },
  onShow() {
    if (app.globalData.merchantToken) {
      wx.redirectTo({ url: "/pages/index/index" });
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [key]: event.detail.value });
  },
  submit() {
    const self = this;
    if (self.data.submitting) {
      return;
    }
    self.setData({ submitting: true });
    api
      .login({
        username: self.data.username,
        password: self.data.password
      })
      .then(function (result) {
        app.globalData.merchantToken = result.token;
        wx.setStorageSync("merchant-token", result.token);
        wx.setStorageSync("merchant-user", result.merchant || null);
        wx.redirectTo({ url: "/pages/index/index" });
      })
      .catch(function () {
        wx.showToast({ title: "账号或密码错误", icon: "none" });
      })
      .finally(function () {
        self.setData({ submitting: false });
      });
  }
});
