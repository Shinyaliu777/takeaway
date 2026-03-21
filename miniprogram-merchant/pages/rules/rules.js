const api = require("../../utils/request");
const app = getApp();

function defaultRuleForm() {
  return {
    name: "",
    meat_count: "",
    veg_count: "",
    price: "",
    sort_order: "",
    enabled: true
  };
}

Page({
  data: {
    rules: [],
    editingId: null,
    extraRicePrice: "2",
    form: defaultRuleForm(),
    previewForm: {
      meat_count: "2",
      veg_count: "1"
    },
    previewResult: null
  },
  async onShow() {
    try {
      await app.ensureMerchantLogin();
      await this.loadData();
    } catch (error) {
      wx.redirectTo({ url: "/pages/login/login" });
    }
  },
  async loadData() {
    try {
      const [shop, rules] = await Promise.all([api.getShop(), api.getComboRules()]);
      this.setData({
        rules: rules || [],
        extraRicePrice: `${shop && shop.extra_rice_price !== undefined ? shop.extra_rice_price : 2}`
      });
      this.loadPreview();
    } catch (error) {
      wx.showToast({ title: "规则加载失败", icon: "none" });
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },
  onExtraRiceInput(event) {
    this.setData({
      extraRicePrice: event.detail.value
    });
  },
  onPreviewInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`previewForm.${key}`]: event.detail.value
    });
  },
  onSwitchChange(event) {
    this.setData({
      "form.enabled": !!event.detail.value
    });
  },
  editRule(event) {
    const rule = event.currentTarget.dataset.rule;
    this.setData({
      editingId: rule.id,
      form: {
        name: rule.name,
        meat_count: `${rule.meat_count}`,
        veg_count: `${rule.veg_count}`,
        price: `${rule.price}`,
        sort_order: `${rule.sort_order}`,
        enabled: rule.enabled !== false
      }
    });
  },
  cancelEdit() {
    this.setData({
      editingId: null,
      form: defaultRuleForm()
    });
  },
  async loadPreview() {
    try {
      const result = await api.previewComboRules(
        Number(this.data.previewForm.meat_count || 0),
        Number(this.data.previewForm.veg_count || 0)
      );
      this.setData({ previewResult: result || null });
    } catch (error) {
      this.setData({ previewResult: null });
    }
  },
  validateForm() {
    const payload = {
      name: (this.data.form.name || "").trim(),
      meat_count: Number(this.data.form.meat_count || 0),
      veg_count: Number(this.data.form.veg_count || 0),
      price: Number(this.data.form.price || 0),
      sort_order: Number(this.data.form.sort_order || 0),
      enabled: !!this.data.form.enabled
    };
    if (!payload.name) {
      return "请填写规则名称";
    }
    if (payload.meat_count <= 0 && payload.veg_count <= 0) {
      return "规则至少要包含荤菜或素菜数量";
    }
    if (payload.price <= 0) {
      return "规则价格必须大于 0";
    }
    return "";
  },
  async saveExtraRicePrice() {
    try {
      const shop = await api.getShop();
      await api.updateShop({
        name: shop.name,
        logo_url: shop.logo_url || "",
        wechat_qr_url: shop.wechat_qr_url || "",
        alipay_qr_url: shop.alipay_qr_url || "",
        tng_qr_url: shop.tng_qr_url || "",
        phone: shop.phone || "",
        address: shop.address || "",
        notice: shop.notice || "",
        business_hours: shop.business_hours || "",
        extra_rice_price: Number(this.data.extraRicePrice || 0),
        featured_enabled: !!shop.featured_enabled,
        featured_cards_json: JSON.stringify(shop.featured_cards || [])
      });
      wx.showToast({ title: "加饭价格已保存", icon: "success" });
      await this.loadData();
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "保存失败", icon: "none" });
    }
  },
  async saveRule() {
    const validationMessage = this.validateForm();
    if (validationMessage) {
      wx.showToast({ title: validationMessage, icon: "none" });
      return;
    }
    const payload = {
      name: this.data.form.name,
      meat_count: Number(this.data.form.meat_count || 0),
      veg_count: Number(this.data.form.veg_count || 0),
      price: Number(this.data.form.price || 0),
      sort_order: Number(this.data.form.sort_order || 0),
      enabled: !!this.data.form.enabled
    };
    try {
      if (this.data.editingId) {
        await api.updateComboRule(this.data.editingId, payload);
      } else {
        await api.createComboRule(payload);
      }
      this.cancelEdit();
      await this.loadData();
      wx.showToast({ title: "规则已保存", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "保存失败", icon: "none" });
    }
  },
  async deleteRule(event) {
    const ruleId = Number(event.currentTarget.dataset.id || 0);
    if (!ruleId) {
      return;
    }
    try {
      await api.deleteComboRule(ruleId);
      if (this.data.editingId === ruleId) {
        this.cancelEdit();
      }
      await this.loadData();
      wx.showToast({ title: "规则已删除", icon: "success" });
    } catch (error) {
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "删除失败", icon: "none" });
    }
  },
  async restoreDefaults() {
    try {
      await new Promise((resolve, reject) => {
        wx.showModal({
          title: "恢复默认规则",
          content: "会用系统默认套餐规则覆盖当前规则，确认继续吗？",
          success(res) {
            if (res.confirm) {
              resolve();
              return;
            }
            reject(new Error("cancelled"));
          },
          fail: reject
        });
      });
      await api.resetComboRules();
      await this.loadData();
      wx.showToast({ title: "已恢复默认规则", icon: "success" });
    } catch (error) {
      if (error && error.message === "cancelled") {
        return;
      }
      const detail = error && error.detail ? error.detail : "";
      wx.showToast({ title: detail || "恢复失败", icon: "none" });
    }
  }
});
