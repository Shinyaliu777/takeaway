const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    cart: [],
    totalAmount: "0.00",
    addresses: [],
    defaultAddress: null,
    canCheckout: false,
    orderHint: ""
  },
  async onShow() {
    if (!app.requireUserLogin("/pages/cart/cart")) {
      return;
    }
    await this.syncCartWithCatalog();
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    app.globalData.userToken = token;
    this.loadAddresses();
  },
  async syncCartWithCatalog() {
    const rawCart = wx.getStorageSync("user-cart") || [];
    if (!rawCart.length) {
      this.loadCart();
      return;
    }
    try {
      const products = await api.getProducts();
      const productMap = {};
      (products || []).forEach((product) => {
        productMap[product.id] = product;
      });
      const nextCart = rawCart
        .filter((item) => productMap[item.product_id] && productMap[item.product_id].sale_status)
        .map((item) => ({
          cart_key: item.cart_key || `${item.product_id}`,
          product_id: item.product_id,
          name: productMap[item.product_id].name,
          selection_label: item.selection_label || "",
          selected_options: item.selected_options || [],
          price_amount: productMap[item.product_id].price_amount,
          quantity: item.quantity
        }));
      if (nextCart.length !== rawCart.length) {
        wx.showToast({ title: "已移除失效商品", icon: "none" });
      }
      wx.setStorageSync("user-cart", nextCart);
    } catch (error) {
      // Ignore catalog refresh failure and fall back to local cart cache.
    }
    this.loadCart();
  },
  loadCart() {
    const cart = (wx.getStorageSync("user-cart") || []).map((item) => ({
      ...item,
      lineAmount: (item.price_amount * item.quantity).toFixed(2)
    }));
    const totalAmount = cart.reduce((sum, item) => sum + item.price_amount * item.quantity, 0).toFixed(2);
    this.setData({ cart, totalAmount });
  },
  syncCart(cart) {
    wx.setStorageSync("user-cart", cart);
    this.loadCart();
    this.setData({
      canCheckout: !!this.data.defaultAddress && cart.length > 0
    });
  },
  increaseQty(event) {
    const cartKey = event.currentTarget.dataset.id;
    const cart = wx.getStorageSync("user-cart") || [];
    const item = cart.find((row) => row.cart_key === cartKey);
    if (item) item.quantity += 1;
    this.syncCart(cart);
  },
  decreaseQty(event) {
    const cartKey = event.currentTarget.dataset.id;
    let cart = wx.getStorageSync("user-cart") || [];
    cart = cart
      .map((row) => (row.cart_key === cartKey ? { ...row, quantity: row.quantity - 1 } : row))
      .filter((row) => row.quantity > 0);
    this.syncCart(cart);
  },
  removeItem(event) {
    const cartKey = event.currentTarget.dataset.id;
    const cart = (wx.getStorageSync("user-cart") || []).filter((row) => row.cart_key !== cartKey);
    this.syncCart(cart);
  },
  clearCart() {
    this.syncCart([]);
  },
  async loadAddresses() {
    try {
      const addresses = await api.getAddresses();
      const defaultAddress = addresses.find((item) => item.is_default) || addresses[0] || null;
      this.setData({
        addresses,
        defaultAddress,
        canCheckout: !!defaultAddress && this.data.cart.length > 0
      });
    } catch (error) {
      wx.showToast({ title: "地址加载失败", icon: "none" });
    }
  },
  goAddresses() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    if (!token) {
      wx.setStorageSync("login-redirect", "/pages/address/address");
      wx.navigateTo({ url: "/pages/login/login" });
      return;
    }
    wx.navigateTo({ url: "/pages/address/address" });
  },
  async checkout() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    if (!token) {
      wx.setStorageSync("login-redirect", "/pages/cart/cart");
      wx.navigateTo({ url: "/pages/login/login" });
      return;
    }
    if (!this.data.canCheckout) {
      wx.showToast({ title: "缺少购物车或地址", icon: "none" });
      return;
    }
    const address = this.data.defaultAddress;
    try {
      const result = await api.createOrder({
        receiver_name: address.receiver_name,
        receiver_mobile: address.receiver_mobile,
        receiver_address: address.detail_address,
        channel_code: "QR",
        items: this.data.cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          selected_options: item.selected_options || []
        }))
      });
      wx.removeStorageSync("user-cart");
      wx.showToast({ title: "订单已创建", icon: "success" });
      this.loadCart();
      this.setData({
        canCheckout: false,
        orderHint: `订单 ${result.order.order_no} 已创建，请上传付款截图等待商家确认`
      });
      setTimeout(() => {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${result.order.id}` });
      }, 400);
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "结算失败", icon: "none" });
    }
  }
});
