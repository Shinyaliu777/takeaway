const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    loading: true,
    product: null,
    category: null,
    cartCount: 0,
    selectedOptions: {}
  },
  onLoad(options) {
    this.productId = Number(options.id || 0);
  },
  onShow() {
    if (!app.requireUserLogin(`/pages/detail/index?id=${this.productId}`)) {
      return;
    }
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
        loading: false,
        selectedOptions: this.buildDefaultSelections((result.product || {}).option_groups || [])
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
  buildDefaultSelections(optionGroups) {
    const selectedOptions = {};
    (optionGroups || []).forEach((group) => {
      const options = group.options || [];
      if (group.required && options.length) {
        selectedOptions[group.group_name] = options[0];
      }
    });
    return selectedOptions;
  },
  chooseOption(event) {
    const group = event.currentTarget.dataset.group;
    const option = event.currentTarget.dataset.option;
    if (!group || !option) {
      return;
    }
    this.setData({
      [`selectedOptions.${group}`]: option
    });
  },
  buildSelectedOptionsPayload() {
    const optionGroups = ((this.data.product || {}).option_groups || []);
    return optionGroups.map((group) => ({
      group_name: group.group_name,
      option_name: this.data.selectedOptions[group.group_name] || ""
    }));
  },
  addToCart() {
    if (!app.requireUserLogin(`/pages/detail/index?id=${this.productId}`)) {
      return;
    }
    const product = this.data.product;
    if (!product) {
      return;
    }
    const optionGroups = product.option_groups || [];
    const selectedOptions = this.buildSelectedOptionsPayload();
    if (optionGroups.some((group) => group.required && !this.data.selectedOptions[group.group_name])) {
      wx.showToast({ title: "请先选好套餐菜品", icon: "none" });
      return;
    }
    const selectionLabel = selectedOptions
      .filter((item) => item.option_name)
      .map((item) => `${item.group_name}:${item.option_name}`)
      .join(" / ");
    const cartKey = [product.id].concat(
      selectedOptions.map((item) => `${item.group_name}:${item.option_name}`)
    ).join("|");
    const cart = wx.getStorageSync("user-cart") || [];
    const found = cart.find((item) => item.cart_key === cartKey);
    if (found) {
      found.quantity += 1;
    } else {
      cart.push({
        cart_key: cartKey,
        product_id: product.id,
        name: product.name,
        selection_label: selectionLabel,
        selected_options: selectedOptions.filter((item) => item.option_name),
        price_amount: product.price_amount,
        quantity: 1
      });
    }
    wx.setStorageSync("user-cart", cart);
    this.syncCartCount();
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },
  goCart() {
    if (!app.requireUserLogin("/pages/cart/cart")) {
      return;
    }
    wx.navigateTo({ url: "/pages/cart/cart" });
  }
});
