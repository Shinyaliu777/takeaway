const api = require("../../utils/request");
const { buildPricingPreview, normalizePricingConfig } = require("../../utils/pricing");
const app = getApp();

function getStoredCart() {
  return wx.getStorageSync("user-cart") || [];
}

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

function buildFeaturedCards(shop = {}, products = []) {
  if (!shop.featured_enabled) {
    return [];
  }
  const productMap = {};
  (products || []).forEach((product) => {
    productMap[product.id] = product;
  });
  return ((shop.featured_cards || []) || [])
    .filter((item) => item && (item.title || item.image_url || item.target_product_id))
    .map((item) => {
      const linkedProduct = productMap[Number(item.target_product_id) || 0] || null;
      return {
        title: item.title || (linkedProduct ? linkedProduct.name : "推荐菜品"),
        subtitle: item.subtitle || (linkedProduct ? linkedProduct.description : ""),
        image_url: item.image_url || (linkedProduct ? linkedProduct.image_url : ""),
        target_product_id: linkedProduct ? linkedProduct.id : 0
      };
    });
}

function inferCurrentPeriod() {
  const currentHour = new Date().getHours();
  return currentHour >= 15 ? "dinner" : "lunch";
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
    isGuest: true,
    shopOpen: true,
    cartCount: 0,
    cartLabel: "",
    featuredProducts: [],
    selectedCategoryId: 0,
    currentPeriod: inferCurrentPeriod(),
    showPaymentSheet: false,
    selectedPaymentKey: "wechat",
    paymentCodes: buildPaymentCodes(),
    selectedPaymentCode: buildPaymentCodes()[0],
    sheetImagePath: "",
    sheetImageLoading: false,
    sheetImageError: false,
    pricingConfig: normalizePricingConfig(),
    pricingPreview: {
      matched: false,
      selectedCount: 0,
      comboLines: [],
      sideLines: [],
      totalAmount: 0,
      summaryText: "先从菜单里选择菜品"
    }
  },
  paymentImageCache: {},
  getActiveCart() {
    return this.data.isGuest ? [] : getStoredCart();
  },
  onShow() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token") || "";
    this.setData({ isGuest: !token });
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
      const pricingConfig = normalizePricingConfig({
        comboRules: (shop || {}).pricing_rules || [],
        extraRicePrice: (shop || {}).extra_rice_price
      });
      const paymentCodes = buildPaymentCodes(shop || {});
      const selectedPaymentCode =
        paymentCodes.find((item) => item.key === this.data.selectedPaymentKey) || paymentCodes[0];
      this.setData({
        shop: shop || {},
        categories: categories || [],
        products: products || [],
        featuredProducts: buildFeaturedCards(shop || {}, products || []),
        shopOpen: isShopOpen((shop || {}).business_hours),
        paymentCodes,
        selectedPaymentCode,
        pricingConfig
      });
      wx.setStorageSync("pricing-config", pricingConfig);
      this.applyFilter(this.data.selectedCategoryId || 0, products || [], this.data.currentPeriod);
      this.preloadPaymentCodes(paymentCodes);
      this.syncCartCount();
    } catch (error) {
      wx.showToast({ title: "菜单加载失败", icon: "none" });
    }
  },
  inferDishKind(categoryId, name = "") {
    const category = (this.data.categories || []).find((item) => item.id === categoryId);
    const categoryName = (category && category.name) || "";
    if (categoryName.includes("荤")) {
      return "meat";
    }
    if (categoryName.includes("素")) {
      return "veg";
    }
    if (name.includes("米饭")) {
      return "rice";
    }
    return "side";
  },
  getDishQuantity(productId, cart = this.getActiveCart()) {
    const found = cart.find((item) => item.product_id === productId);
    return found ? found.quantity : 0;
  },
  refreshProductSelections(cart = this.getActiveCart()) {
    const mapSelection = (list) => (list || []).map((item) => ({
      ...item,
      selected_qty: this.getDishQuantity(item.id, cart)
    }));
    this.setData({
      filteredProducts: mapSelection(this.data.filteredProducts),
      featuredProducts: this.data.featuredProducts
    });
  },
  isProductAvailableInPeriod(product, period = this.data.currentPeriod) {
    if (!product) {
      return false;
    }
    if (period === "dinner") {
      return product.available_dinner !== false;
    }
    return product.available_lunch !== false;
  },
  addToCart(event) {
    if (!app.requireUserLogin("/pages/index/index")) {
      return;
    }
    if (!this.data.shopOpen) {
      wx.showToast({ title: "当前不在营业时间", icon: "none" });
      return;
    }
    const product = event.currentTarget.dataset.product;
    if (product && product.option_groups && product.option_groups.length) {
      wx.navigateTo({ url: `/pages/detail/index?id=${product.id}` });
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
        dish_kind: this.inferDishKind(product.category_id, product.name),
        quantity: 1
      });
    }
    wx.setStorageSync("user-cart", cart);
    this.syncCartCount();
  },
  increaseDish(event) {
    const product = event.currentTarget.dataset.product;
    if (!product) {
      return;
    }
    this.addToCart({ currentTarget: { dataset: { product } } });
  },
  decreaseDish(event) {
    if (this.data.isGuest) {
      app.requireUserLogin("/pages/index/index");
      return;
    }
    const productId = Number(event.currentTarget.dataset.productId || 0);
    const cart = getStoredCart()
      .map((item) => (item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0);
    wx.setStorageSync("user-cart", cart);
    this.syncCartCount();
  },
  applyFilter(categoryId, products = this.data.products, period = this.data.currentPeriod) {
    const availableProducts = (products || []).filter((item) => this.isProductAvailableInPeriod(item, period));
    const filteredProducts = !categoryId
      ? availableProducts
      : availableProducts.filter((item) => item.category_id === categoryId);
    this.setData({
      selectedCategoryId: categoryId,
      currentPeriod: period,
      filteredProducts: filteredProducts.map((item) => ({
        ...item,
        selected_qty: this.getDishQuantity(item.id)
      }))
    });
  },
  selectPeriod(event) {
    const period = event.currentTarget.dataset.period || "lunch";
    this.applyFilter(this.data.selectedCategoryId || 0, this.data.products, period);
  },
  selectCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId || 0);
    this.applyFilter(categoryId, this.data.products, this.data.currentPeriod);
  },
  goProductDetail(event) {
    const productId = Number(event.currentTarget.dataset.productId);
    wx.navigateTo({ url: `/pages/detail/index?id=${productId}` });
  },
  goFeaturedProduct(event) {
    const productId = Number(event.currentTarget.dataset.productId || 0);
    if (!productId) {
      return;
    }
    this.goProductDetail({ currentTarget: { dataset: { productId } } });
  },
  previewDishImage(event) {
    const imageUrl = event.currentTarget.dataset.imageUrl || "";
    if (!imageUrl) {
      return;
    }
    wx.previewImage({
      current: imageUrl,
      urls: [imageUrl]
    });
  },
  syncCartCount() {
    const cart = this.getActiveCart();
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const pricingPreview = buildPricingPreview(cart, this.data.pricingConfig);
    this.setData({
      cartCount,
      cartLabel: cartCount ? ` (${cartCount})` : "",
      pricingPreview
    });
    this.refreshProductSelections(cart);
  },
  goCart() {
    if (!app.requireUserLogin("/pages/cart/cart")) {
      return;
    }
    wx.navigateTo({ url: "/pages/cart/cart" });
  },
  goOrders() {
    if (!app.requireUserLogin("/pages/orders/orders")) {
      return;
    }
    wx.navigateTo({ url: "/pages/orders/orders" });
  },
  goProfile() {
    if (!app.requireUserLogin("/pages/profile/profile")) {
      return;
    }
    wx.navigateTo({ url: "/pages/profile/profile" });
  },
  goMessages() {
    if (!app.requireUserLogin("/pages/messages/messages")) {
      return;
    }
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
