const config = require("./config");

App({
  globalData: {
    apiBase: config.apiBase,
    userToken: "",
    userInfo: null
  },
  onLaunch() {
    this.globalData.userToken = wx.getStorageSync("user-token") || "";
    this.globalData.userInfo = wx.getStorageSync("user-info") || null;
  },
  loginUser(nickname = "微信用户", avatarUrl = "", phoneAuth = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            reject({ detail: "微信登录凭证获取失败" });
            return;
          }
          wx.request({
            url: `${this.globalData.apiBase}/api/user/login`,
            method: "POST",
            timeout: 12000,
            data: {
              code: loginRes.code,
              nickname,
              avatar_url: avatarUrl,
              phone_code: phoneAuth.code || "",
              encrypted_data: phoneAuth.encryptedData || "",
              iv: phoneAuth.iv || ""
            },
            success: (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const { token, user } = res.data || {};
                this.globalData.userToken = token || "";
                this.globalData.userInfo = user || null;
                wx.setStorageSync("user-token", this.globalData.userToken);
                wx.setStorageSync("user-info", this.globalData.userInfo);
                wx.setStorageSync("user-nickname", nickname);
                resolve(res.data);
                return;
              }
              reject(res.data || { detail: "登录失败" });
            },
            fail: (error) => {
              const errMsg = (error && error.errMsg) || "";
              if (errMsg.includes("timeout")) {
                reject({ detail: "登录超时，请确认云端服务已发布" });
                return;
              }
              reject({ detail: "网络异常，请稍后重试" });
            }
          });
        },
        fail: () => {
          reject({ detail: "微信登录能力调用失败" });
        }
      });
    });
  },
  ensureUserLogin(nickname = "微信用户") {
    if (this.globalData.userToken) {
      return Promise.resolve({
        token: this.globalData.userToken,
        user: this.globalData.userInfo
      });
    }
    return Promise.reject(new Error("user login required"));
  },
  requireUserLogin(redirect) {
    const token = this.globalData.userToken || wx.getStorageSync("user-token") || "";
    if (token) {
      this.globalData.userToken = token;
      this.globalData.userInfo = wx.getStorageSync("user-info") || this.globalData.userInfo;
      return true;
    }
    if (redirect) {
      wx.setStorageSync("login-redirect", redirect);
    }
    wx.navigateTo({ url: "/pages/login/login" });
    return false;
  },
  logoutUser() {
    this.globalData.userToken = "";
    this.globalData.userInfo = null;
    wx.removeStorageSync("user-token");
    wx.removeStorageSync("user-info");
    wx.removeStorageSync("user-nickname");
  }
});
