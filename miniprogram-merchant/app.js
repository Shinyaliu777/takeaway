const config = require("./config");

App({
  globalData: {
    apiBase: config.apiBase,
    cloudEnv: config.cloudEnv,
    merchantToken: ""
  },
  onLaunch() {
    if (wx.cloud && config.cloudEnv) {
      wx.cloud.init({
        env: config.cloudEnv,
        traceUser: true
      });
    }
    this.globalData.merchantToken = wx.getStorageSync("merchant-token") || "";
  },
  ensureMerchantLogin() {
    if (this.globalData.merchantToken) {
      return Promise.resolve(this.globalData.merchantToken);
    }
    return Promise.reject(new Error("merchant login required"));
  }
});
