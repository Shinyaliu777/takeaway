const app = getApp();

function request(path, method = "GET", data, withAuth = true) {
  const header = {};
  if (withAuth && app.globalData.merchantToken) {
    header.Authorization = `Bearer ${app.globalData.merchantToken}`;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${path}`,
      method,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401) {
          app.globalData.merchantToken = "";
          wx.removeStorageSync("merchant-token");
          wx.removeStorageSync("merchant-user");
        }
        reject(res.data || { detail: "Request failed" });
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  login: (data) => request("/api/merchant/login", "POST", data, false),
  getOrders: () => request("/api/merchant/orders"),
  getOrderDetail: (orderId) => request(`/api/merchant/orders/${orderId}`),
  updateOrder: (orderId, data) => request(`/api/merchant/orders/${orderId}`, "PATCH", data),
  confirmPayment: (orderId) => request(`/api/merchant/orders/${orderId}/confirm-payment`, "POST"),
  rejectPayment: (orderId) => request(`/api/merchant/orders/${orderId}/reject-payment`, "POST"),
  getCategories: () => request("/api/merchant/categories"),
  createCategory: (data) => request("/api/merchant/categories", "POST", data),
  updateCategory: (categoryId, data) => request(`/api/merchant/categories/${categoryId}`, "PATCH", data),
  deleteCategory: (categoryId) => request(`/api/merchant/categories/${categoryId}`, "DELETE"),
  getProducts: () => request("/api/merchant/products"),
  createProduct: (data) => request("/api/merchant/products", "POST", data),
  updateProduct: (productId, data) => request(`/api/merchant/products/${productId}`, "PATCH", data),
  getShop: () => request("/api/merchant/shop"),
  updateShop: (data) => request("/api/merchant/shop", "PUT", data),
  getComboRules: () => request("/api/merchant/combo-rules"),
  createComboRule: (data) => request("/api/merchant/combo-rules", "POST", data),
  updateComboRule: (ruleId, data) => request(`/api/merchant/combo-rules/${ruleId}`, "PATCH", data),
  deleteComboRule: (ruleId) => request(`/api/merchant/combo-rules/${ruleId}`, "DELETE"),
  getUsers: () => request("/api/merchant/users"),
  getUserDetail: (userId) => request(`/api/merchant/users/${userId}`),
  getMessages: () => request("/api/merchant/messages"),
  readMessage: (messageId) => request(`/api/merchant/messages/${messageId}/read`, "PATCH"),
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBase}/api/merchant/uploads/image`,
        filePath,
        name: "file",
        header: {
          Authorization: `Bearer ${app.globalData.merchantToken}`
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
