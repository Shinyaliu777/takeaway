const app = getApp();

function request(path, method = "GET", data) {
  return new Promise((resolve, reject) => {
    const header = {};
    const token = app.globalData.userToken || wx.getStorageSync("user-token") || "";
    if (token) {
      app.globalData.userToken = token;
      header.Authorization = `Bearer ${token}`;
    }
    wx.request({
      url: `${app.globalData.apiBase}${path}`,
      method,
      data,
      header,
      timeout: 12000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401) {
          app.globalData.userToken = "";
          app.globalData.userInfo = null;
          wx.removeStorageSync("user-token");
          wx.removeStorageSync("user-info");
          wx.removeStorageSync("user-nickname");
        }
        reject(res.data || { detail: "Request failed" });
      },
      fail(err) {
        const errMsg = (err && err.errMsg) || "";
        if (errMsg.includes("timeout")) {
          reject({ detail: "请求超时，请确认云端服务可用" });
          return;
        }
        reject(err);
      }
    });
  });
}

module.exports = {
  userLogin: (data) => request("/api/user/login", "POST", data),
  getUserProfile: () => request("/api/user/profile"),
  updateUserProfile: (data) => request("/api/user/profile", "PATCH", data),
  getShop: () => request("/api/shop"),
  getCategories: () => request("/api/categories"),
  getProducts: () => request("/api/products"),
  getProductDetail: (productId) => request(`/api/products/${productId}`),
  getAddresses: () => request("/api/addresses"),
  createAddress: (data) => request("/api/addresses", "POST", data),
  updateAddress: (addressId, data) => request(`/api/addresses/${addressId}`, "PUT", data),
  deleteAddress: (addressId) => request(`/api/addresses/${addressId}`, "DELETE"),
  getOrders: () => request("/api/orders"),
  getOrderDetail: (orderId) => request(`/api/orders/${orderId}`),
  getMessages: () => request("/api/user/messages"),
  readMessage: (messageId) => request(`/api/user/messages/${messageId}/read`, "PATCH"),
  createOrder: (data) => request("/api/orders/create", "POST", data),
  submitPaymentProof: (orderId, data) => request(`/api/orders/${orderId}/payment-proof`, "POST", data),
  uploadPaymentProof(filePath) {
    return new Promise((resolve, reject) => {
      const token = app.globalData.userToken || wx.getStorageSync("user-token") || "";
      if (token) {
        app.globalData.userToken = token;
      }
      wx.uploadFile({
        url: `${app.globalData.apiBase}/api/user/uploads/payment-proof`,
        filePath,
        name: "file",
        header: {
          Authorization: token ? `Bearer ${token}` : ""
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(res.data));
            return;
          }
          reject(res);
        },
        fail: reject
      });
    });
  }
};
