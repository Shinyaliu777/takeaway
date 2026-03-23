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

function normalizeUploadError(err, fallback = "上传失败，请稍后重试") {
  if (!err) {
    return { detail: fallback };
  }
  const detail = String(err.detail || err.message || "").trim();
  if (detail) {
    return { ...err, detail };
  }
  const errMsg = String(err.errMsg || "").trim();
  if (errMsg.includes("timeout")) {
    return { ...err, detail: "上传超时，请稍后重试" };
  }
  if (errMsg.includes("abort")) {
    return { ...err, detail: "上传已中断，请重新选择截图再试" };
  }
  const statusCode = Number(err.statusCode || 0);
  if (statusCode === 401) {
    return { ...err, detail: "登录已过期，请重新登录后再上传" };
  }
  if (statusCode === 413) {
    return { ...err, detail: "图片过大，请重新选择更小的截图" };
  }
  if (statusCode >= 500) {
    return { ...err, detail: "服务暂时繁忙，请稍后重试" };
  }
  return { ...err, detail: fallback };
}

function uploadFile(path, filePath, name = "file", options = {}) {
  return new Promise((resolve, reject) => {
    const header = {};
    const token = app.globalData.userToken || wx.getStorageSync("user-token") || "";
    if (token) {
      app.globalData.userToken = token;
      header.Authorization = `Bearer ${token}`;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (task && typeof task.abort === "function") {
        task.abort();
      }
      reject({ detail: "上传超时，请稍后重试" });
    }, 60000);

    const task = wx.uploadFile({
      url: `${app.globalData.apiBase}${path}`,
      filePath,
      name,
      header,
      success(res) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        let data = {};
        try {
          data = JSON.parse(res.data || "{}");
        } catch (error) {
          reject({ detail: "上传响应解析失败，请稍后重试" });
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
          return;
        }
        if (res.statusCode === 401) {
          app.globalData.userToken = "";
          app.globalData.userInfo = null;
          wx.removeStorageSync("user-token");
          wx.removeStorageSync("user-info");
          wx.removeStorageSync("user-nickname");
        }
        reject(normalizeUploadError({
          ...data,
          statusCode: res.statusCode
        }, "上传失败，请稍后重试"));
      },
      fail(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(normalizeUploadError(err, "上传失败，请稍后重试"));
      }
    });

    if (task && typeof task.onProgressUpdate === "function" && typeof options.onProgress === "function") {
      task.onProgressUpdate((progress) => {
        options.onProgress(progress || {});
      });
    }
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
  uploadPaymentProof(filePath, options) {
    return uploadFile("/api/user/uploads/payment-proof", filePath, "file", options);
  }
};
