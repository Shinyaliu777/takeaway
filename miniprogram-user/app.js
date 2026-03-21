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
  requestUserAuthorization() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: "用于展示用户昵称和头像，并完成下单登录",
        success: (res) => {
          resolve({
            nickname: (res.userInfo && res.userInfo.nickName) || "微信用户",
            avatarUrl: (res.userInfo && res.userInfo.avatarUrl) || ""
          });
        },
        fail: reject
      });
    });
  },
  loginUser(nickname = "微信用户", avatarUrl = "", phoneAuth = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            reject(new Error("wx.login failed"));
            return;
          }
          wx.request({
            url: `${this.globalData.apiBase}/api/user/login`,
            method: "POST",
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
            fail: reject
          });
        },
        fail: reject
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
