const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    categories: [],
    editingId: null,
    form: {
      name: "",
      sort_order: 0,
      status: true
    }
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      this.loadCategories();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadCategories() {
    try {
      const categories = await api.getCategories();
      this.setData({ categories });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  onSwitch(event) {
    this.setData({ "form.status": event.detail.value });
  },
  editCategory(event) {
    const category = event.currentTarget.dataset.category;
    this.setData({
      editingId: category.id,
      form: {
        name: category.name,
        sort_order: category.sort_order,
        status: category.status
      }
    });
  },
  cancelEdit() {
    this.setData({
      editingId: null,
      form: {
        name: "",
        sort_order: 0,
        status: true
      }
    });
  },
  async saveCategory() {
    const payload = {
      name: this.data.form.name,
      sort_order: Number(this.data.form.sort_order || 0),
      status: !!this.data.form.status
    };
    try {
      if (this.data.editingId) {
        await api.updateCategory(this.data.editingId, payload);
      } else {
        await api.createCategory(payload);
      }
      this.cancelEdit();
      this.loadCategories();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "保存失败", icon: "none" });
    }
  },
  async deleteCategory(event) {
    try {
      await api.deleteCategory(event.currentTarget.dataset.id);
      this.loadCategories();
      wx.showToast({ title: "已删除", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      let message = detail || "删除失败";
      if (detail === "Category has related products") {
        message = "该分类下还有商品，先移走或删除商品";
      } else if (detail === "Category not found") {
        message = "分类不存在";
      }
      wx.showToast({ title: message, icon: "none" });
    }
  }
});
