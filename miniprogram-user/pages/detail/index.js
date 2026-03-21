const api = require("../../utils/request");

Page({
  data: {
    loading: true,
    product: null,
    category: null,
    cartCount: 0
  },
  onLoad(options) {
    this.productId = Number(options.id || 0);
  },
  onShow() {
    this.loadDetail();
    this.syncCartCount();
  },
  async loadDetail() {
    if (!this.productId) {
      wx.showToast({ title: "商品不存在", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const result = await api.getProductDetail(this.productId);
      this.setData({
        product: result.product || null,
        category: result.category || null,
        loading: false
      });
      if (result && result.product && result.product.name) {
        wx.setNavigationBarTitle({
          title: result.product.name
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "商品加载失败", icon: "none" });
    }
  },
  syncCartCount() {
    const cart = wx.getStorageSync("user-cart") || [];
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartCount });
  },
  addToCart() {
    const product = this.data.product;
    if (!product) {
      return;
    }
    const cart = wx.getStorageSync("user-cart") || [];
    const found = cart.find((item) => item.product_id === product.id);
    if (found) {
      found.quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price_amount: product.price_amount,
        quantity: 1
      });
    }
    wx.setStorageSync("user-cart", cart);
    this.syncCartCount();
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },
  goCart() {
    wx.navigateTo({ url: "/pages/cart/cart" });
  }
});
