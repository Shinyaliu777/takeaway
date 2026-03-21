const config = require("./config");

App({
  globalData: {
    apiBase: config.apiBase,
    merchantToken: ""
  },
  onLaunch() {
    this.globalData.merchantToken = wx.getStorageSync("merchant-token") || "";
  },
  ensureMerchantLogin() {
    if (this.globalData.merchantToken) {
      return Promise.resolve(this.globalData.merchantToken);
    }
    return Promise.reject(new Error("merchant login required"));
  }
});
