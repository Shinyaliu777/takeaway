const api = require("../../utils/request");
const app = getApp();

function buildPaymentCodes(shop = {}) {
  return [
    {
      key: "wechat",
      title: "微信",
      subtitle: shop.wechat_qr_url ? "微信收款码" : "微信收款码未上传",
      imageUrl: shop.wechat_qr_url || "",
      uploaded: !!shop.wechat_qr_url
    },
    {
      key: "alipay",
      title: "支付宝",
      subtitle: shop.alipay_qr_url ? "支付宝收款码" : "支付宝收款码未上传",
      imageUrl: shop.alipay_qr_url || "",
      uploaded: !!shop.alipay_qr_url
    },
    {
      key: "tng",
      title: "TNG",
      subtitle: shop.tng_qr_url ? "TNG 收款码" : "TNG 收款码未上传",
      imageUrl: shop.tng_qr_url || "",
      uploaded: !!shop.tng_qr_url
    }
  ];
}

function isShopOpen(hours) {
  if (!hours || !hours.includes("-")) {
    return true;
  }
  const [start, end] = hours.split("-");
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startValue = startHour * 60 + startMinute;
  const endValue = endHour * 60 + endMinute;
  return current >= startValue && current <= endValue;
}

Page({
  data: {
    shop: {},
    categories: [],
    products: [],
    filteredProducts: [],
    shopOpen: true,
    cartCount: 0,
    cartLabel: "",
    featuredProducts: [],
    selectedCategoryId: 0,
    showPaymentSheet: false,
    selectedPaymentKey: "wechat",
    paymentCodes: buildPaymentCodes(),
    selectedPaymentCode: buildPaymentCodes()[0],
    sheetImagePath: "",
    sheetImageLoading: false,
    sheetImageError: false
  },
  paymentImageCache: {},
  onShow() {
    this.ensureLoginAndLoad();
    this.syncCartCount();
  },
  async ensureLoginAndLoad() {
    try {
      const [shop, categories, products] = await Promise.all([
        api.getShop(),
        api.getCategories(),
        api.getProducts()
      ]);
      const paymentCodes = buildPaymentCodes(shop || {});
      const selectedPaymentCode =
        paymentCodes.find((item) => item.key === this.data.selectedPaymentKey) || paymentCodes[0];
      this.setData({
        shop: shop || {},
        categories: categories || [],
        products: products || [],
        featuredProducts: (products || []).slice(0, 2),
        shopOpen: isShopOpen((shop || {}).business_hours),
        paymentCodes,
        selectedPaymentCode
      });
      this.applyFilter(this.data.selectedCategoryId || 0, products || []);
      this.preloadPaymentCodes(paymentCodes);
    } catch (error) {
      wx.showToast({ title: "菜单加载失败", icon: "none" });
    }

    const nickname = wx.getStorageSync("user-nickname") || "微信用户";
    try {
      await app.ensureUserLogin(nickname);
    } catch (error) {
      if (error && error.detail === "WeChat login is not configured") {
        wx.showToast({ title: "微信登录未配置，先浏览菜单", icon: "none" });
      }
    }
  },
  addToCart(event) {
    if (!this.data.shopOpen) {
      wx.showToast({ title: "当前不在营业时间", icon: "none" });
      return;
    }
    const product = event.currentTarget.dataset.product;
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
    wx.showToast({ title: "已加入", icon: "success" });
  },
  applyFilter(categoryId, products = this.data.products) {
    const filteredProducts = !categoryId
      ? products
      : (products || []).filter((item) => item.category_id === categoryId);
    this.setData({
      selectedCategoryId: categoryId,
      filteredProducts
    });
  },
  selectCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId || 0);
    this.applyFilter(categoryId);
  },
  goProductDetail(event) {
    const productId = Number(event.currentTarget.dataset.productId);
    wx.navigateTo({ url: `/pages/detail/index?id=${productId}` });
  },
  syncCartCount() {
    const cart = wx.getStorageSync("user-cart") || [];
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({
      cartCount,
      cartLabel: cartCount ? ` (${cartCount})` : ""
    });
  },
  goCart() {
    wx.navigateTo({ url: "/pages/cart/cart" });
  },
  goOrders() {
    wx.navigateTo({ url: "/pages/orders/orders" });
  },
  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },
  goMessages() {
    wx.navigateTo({ url: "/pages/messages/messages" });
  },
  previewPaymentQr(event) {
    const paymentKey = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.key
      : "";
    const targetKey = paymentKey || this.data.selectedPaymentKey || "wechat";
    const currentCode = this.data.paymentCodes.find((item) => item.key === targetKey) || this.data.paymentCodes[0];
    if (!currentCode) {
      return;
    }
    if (!currentCode.imageUrl) {
      wx.showToast({ title: "商家暂未上传该收款码", icon: "none" });
      return;
    }
    this.setData({
      selectedPaymentKey: currentCode.key,
      selectedPaymentCode: currentCode,
      showPaymentSheet: true,
      sheetImagePath: this.paymentImageCache[currentCode.key] || "",
      sheetImageLoading: !!currentCode.imageUrl && !this.paymentImageCache[currentCode.key],
      sheetImageError: false
    });
    if (!this.paymentImageCache[currentCode.key]) {
      this.loadSheetQr(currentCode.key, currentCode.imageUrl);
    }
  },
  savePaymentQr(event) {
    const paymentKey = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.key
      : "";
    const targetKey = paymentKey || this.data.selectedPaymentKey || "wechat";
    const currentCode = this.data.paymentCodes.find((item) => item.key === targetKey) || this.data.paymentCodes[0];
    const currentUrl = currentCode ? currentCode.imageUrl : "";
    if (!currentUrl) {
      wx.showToast({ title: "暂无可保存的收款码", icon: "none" });
      return;
    }
    wx.getImageInfo({
      src: currentUrl,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.path,
          success: () => {
            wx.showToast({ title: "收款码已保存", icon: "success" });
          },
          fail: () => {
            wx.showToast({ title: "保存失败", icon: "none" });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: "收款码加载失败", icon: "none" });
      }
    });
  },
  selectPaymentCode(event) {
    const paymentKey = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.key
      : "";
    if (!paymentKey || paymentKey === this.data.selectedPaymentKey) {
      return;
    }
    const nextCode = this.data.paymentCodes.find((item) => item.key === paymentKey) || this.data.selectedPaymentCode;
    this.setData({
      selectedPaymentKey: paymentKey,
      selectedPaymentCode: nextCode,
      sheetImagePath: this.paymentImageCache[paymentKey] || "",
      sheetImageLoading: this.data.showPaymentSheet && !!(nextCode && nextCode.imageUrl) && !this.paymentImageCache[paymentKey],
      sheetImageError: false
    });
    if (this.data.showPaymentSheet && !this.paymentImageCache[paymentKey]) {
      this.loadSheetQr(paymentKey, nextCode && nextCode.imageUrl);
    }
  },
  closePaymentSheet() {
    this.setData({
      showPaymentSheet: false,
      sheetImagePath: "",
      sheetImageLoading: false,
      sheetImageError: false
    });
  },
  stopPaymentSheet() {},
  preloadPaymentCodes(paymentCodes) {
    (paymentCodes || []).forEach((item) => {
      if (item && item.imageUrl && !this.paymentImageCache[item.key]) {
        this.loadSheetQr(item.key, item.imageUrl, true);
      }
    });
  },
  loadSheetQr(paymentKey, imageUrl, silent) {
    if (!imageUrl) {
      if (!silent) {
        this.setData({
          sheetImagePath: "",
          sheetImageLoading: false,
          sheetImageError: true
        });
      }
      return;
    }
    wx.getImageInfo({
      src: imageUrl,
      success: (res) => {
        const localPath = res && res.path ? res.path : imageUrl;
        this.paymentImageCache[paymentKey] = localPath;
        this.setData({
          sheetImagePath: this.data.selectedPaymentKey === paymentKey ? localPath : this.data.sheetImagePath,
          sheetImageLoading: false,
          sheetImageError: false
        });
      },
      fail: () => {
        if (!silent) {
          this.setData({
            sheetImagePath: imageUrl,
            sheetImageLoading: false,
            sheetImageError: true
          });
        }
      }
    });
  }
});
