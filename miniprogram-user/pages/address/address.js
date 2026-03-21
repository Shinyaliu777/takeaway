const api = require("../../utils/request");
const app = getApp();

Page({
  data: {
    addresses: [],
    isGuest: true,
    editingId: null,
    form: {
      receiver_name: "",
      receiver_mobile: "",
      detail_address: "",
      is_default: false
    }
  },
  async onShow() {
    const token = app.globalData.userToken || wx.getStorageSync("user-token");
    if (!token) {
      this.setData({
        isGuest: true,
        addresses: []
      });
      return;
    }
    app.globalData.userToken = token;
    this.setData({ isGuest: false });
    this.loadAddresses();
  },
  async loadAddresses() {
    try {
      const addresses = await api.getAddresses();
      this.setData({ addresses });
    } catch (error) {
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },
  onSwitch(event) {
    this.setData({
      "form.is_default": event.detail.value
    });
  },
  editAddress(event) {
    const address = event.currentTarget.dataset.address;
    this.setData({
      editingId: address.id,
      form: {
        receiver_name: address.receiver_name,
        receiver_mobile: address.receiver_mobile,
        detail_address: address.detail_address,
        is_default: address.is_default
      }
    });
  },
  async deleteAddress(event) {
    try {
      await api.deleteAddress(event.currentTarget.dataset.id);
      this.loadAddresses();
      wx.showToast({ title: "已删除", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "删除失败", icon: "none" });
    }
  },
  cancelEdit() {
    this.setData({
      editingId: null,
      form: {
        receiver_name: "",
        receiver_mobile: "",
        detail_address: "",
        is_default: false
      }
    });
  },
  async saveAddress() {
    const { receiver_name, receiver_mobile, detail_address } = this.data.form;
    if (!receiver_name || !receiver_mobile || !detail_address) {
      wx.showToast({ title: "请完整填写", icon: "none" });
      return;
    }
    try {
      if (this.data.editingId) {
        await api.updateAddress(this.data.editingId, this.data.form);
      } else {
        await api.createAddress(this.data.form);
      }
      this.setData({
        editingId: null,
        form: {
          receiver_name: "",
          receiver_mobile: "",
          detail_address: "",
          is_default: false
        }
      });
      this.loadAddresses();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },
  goLogin() {
    wx.setStorageSync("login-redirect", "/pages/address/address");
    wx.navigateTo({ url: "/pages/login/login" });
  }
});
