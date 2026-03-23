const api = require("../../utils/request");
const cloud = require("../../utils/cloud");
const app = getApp();

Page({
  data: {
    products: [],
    filteredProducts: [],
    categories: [],
    categoryOptions: [],
    categoryIndex: 0,
    categoryFilter: "all",
    searchKeyword: "",
    periodFilter: "all",
    saleFilter: "all",
    summaryText: "加载商品后可按名称、分类和时段快速筛选。",
    editingId: null,
    form: {
      category_id: 1,
      name: "",
      image_url: "",
      image_preview_url: "",
      description: "",
      price_amount: "",
      stock_qty: "",
      sale_status: true,
      available_lunch: true,
      available_dinner: true
    }
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      await this.loadCategories();
      this.loadProducts();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadCategories() {
    try {
      const categories = await api.getCategories();
      const categoryOptions = (categories || []).map((item) => item.name);
      this.setData({ categories, categoryOptions });
    } catch (error) {}
  },
  async loadProducts() {
    try {
      const products = await api.getProducts();
      let resolvedRefs = {};
      try {
        resolvedRefs = await cloud.resolveFileRefs((products || []).map((item) => item.image_url || ""));
      } catch (error) {}
      const productsWithCategory = (products || []).map((item) => {
        const category = this.data.categories.find((row) => row.id === item.category_id);
        return {
          ...item,
          image_preview_url: resolvedRefs[item.image_url] || "",
          category_name: category ? category.name : `分类${item.category_id}`
        };
      });
      this.setData({ products: productsWithCategory });
      this.applyFilters();
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value || "" });
    this.applyFilters();
  },
  setCategoryFilter(event) {
    this.setData({ categoryFilter: event.currentTarget.dataset.value || "all" });
    this.applyFilters();
  },
  setPeriodFilter(event) {
    this.setData({ periodFilter: event.currentTarget.dataset.value || "all" });
    this.applyFilters();
  },
  setSaleFilter(event) {
    this.setData({ saleFilter: event.currentTarget.dataset.value || "all" });
    this.applyFilters();
  },
  clearFilters() {
    this.setData({
      searchKeyword: "",
      categoryFilter: "all",
      periodFilter: "all",
      saleFilter: "all"
    });
    this.applyFilters();
  },
  applyFilters() {
    const keyword = (this.data.searchKeyword || "").trim().toLowerCase();
    const categoryFilter = this.data.categoryFilter;
    const periodFilter = this.data.periodFilter;
    const saleFilter = this.data.saleFilter;
    const filteredProducts = (this.data.products || []).filter((item) => {
      const matchesKeyword =
        !keyword ||
        (item.name || "").toLowerCase().includes(keyword) ||
        (item.category_name || "").toLowerCase().includes(keyword);
      const matchesCategory =
        categoryFilter === "all" || Number(item.category_id) === Number(categoryFilter);
      const matchesPeriod =
        periodFilter === "all" ||
        (periodFilter === "lunch" && item.available_lunch) ||
        (periodFilter === "dinner" && item.available_dinner);
      const matchesSale =
        saleFilter === "all" ||
        (saleFilter === "on" && item.sale_status) ||
        (saleFilter === "off" && !item.sale_status);
      return matchesKeyword && matchesCategory && matchesPeriod && matchesSale;
    });
    this.setData({
      filteredProducts,
      summaryText: this.buildSummary(filteredProducts.length)
    });
  },
  buildSummary(filteredCount) {
    const parts = [];
    const keyword = (this.data.searchKeyword || "").trim();
    if (keyword) {
      parts.push(`关键词「${keyword}」`);
    }
    if (this.data.categoryFilter !== "all") {
      const category = (this.data.categories || []).find((item) => Number(item.id) === Number(this.data.categoryFilter));
      parts.push(category ? category.name : "当前分类");
    }
    if (this.data.periodFilter !== "all") {
      parts.push(this.data.periodFilter === "lunch" ? "午餐可点" : "晚餐可点");
    }
    if (this.data.saleFilter !== "all") {
      parts.push(this.data.saleFilter === "on" ? "仅上架" : "仅下架");
    }
    if (!parts.length) {
      return `当前显示 ${filteredCount} 个商品，可直接搜索和筛选。`;
    }
    return `按 ${parts.join("、")} 筛选后显示 ${filteredCount} 个商品。`;
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file || !file.tempFilePath) {
          return;
        }
        try {
          wx.showLoading({ title: "上传中" });
          const result = await api.uploadImage(file.tempFilePath);
          this.setData({
            "form.image_url": result.file_id || result.image_url || "",
            "form.image_preview_url": result.preview_url || file.tempFilePath
          });
          wx.showToast({ title: "上传成功", icon: "success" });
        } catch (error) {
          wx.showToast({ title: "上传失败", icon: "none" });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },
  clearImage() {
    this.setData({
      "form.image_url": ""
      ,"form.image_preview_url": ""
    });
  },
  editProduct(event) {
    const product = event.currentTarget.dataset.product;
    const categoryIndex = this.data.categories.findIndex((item) => item.id === product.category_id);
    this.setData({
      editingId: product.id,
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
      form: {
        category_id: product.category_id,
        name: product.name,
        image_url: product.image_url || "",
        image_preview_url: product.image_preview_url || product.image_url || "",
        description: product.description || "",
        price_amount: product.price_amount,
        stock_qty: product.stock_qty,
        sale_status: product.sale_status,
        available_lunch: product.available_lunch !== false,
        available_dinner: product.available_dinner !== false
      }
    });
  },
  onCategoryChange(event) {
    const categoryIndex = Number(event.detail.value);
    const category = this.data.categories[categoryIndex];
    this.setData({
      categoryIndex,
      "form.category_id": category ? category.id : 1
    });
  },
  onSwitchChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: !!event.detail.value
    });
  },
  async toggleSaleStatus(event) {
    const product = event.currentTarget.dataset.product;
    try {
      await api.updateProduct(product.id, {
        category_id: product.category_id,
        name: product.name,
        image_url: product.image_url || "",
        description: product.description || "",
        price_amount: Number(product.price_amount),
        stock_qty: Number(product.stock_qty),
        sale_status: !product.sale_status,
        available_lunch: product.available_lunch !== false,
        available_dinner: product.available_dinner !== false
      });
      this.loadProducts();
      wx.showToast({ title: "已更新", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "更新失败", icon: "none" });
    }
  },
  cancelEdit() {
    this.setData({
      editingId: null,
      form: {
        category_id: 1,
        name: "",
        image_url: "",
        image_preview_url: "",
        description: "",
        price_amount: "",
        stock_qty: "",
        sale_status: true,
        available_lunch: true,
        available_dinner: true
      },
      categoryIndex: 0
    });
  },
  async saveProduct() {
    try {
      const payload = {
        ...this.data.form,
        category_id: Number(this.data.form.category_id),
        price_amount: Number(this.data.form.price_amount),
        stock_qty: Number(this.data.form.stock_qty)
      };
      delete payload.image_preview_url;
      if (this.data.editingId) {
        await api.updateProduct(this.data.editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      this.setData({
        editingId: null,
        form: {
          category_id: 1,
          name: "",
          image_url: "",
          image_preview_url: "",
          description: "",
          price_amount: "",
          stock_qty: "",
          sale_status: true,
          available_lunch: true,
          available_dinner: true
        },
        categoryIndex: 0
      });
      this.loadProducts();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  }
});
