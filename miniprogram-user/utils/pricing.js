const PACKAGE_COMBOS = [
  { name: "两荤一素套餐", meat: 2, veg: 1, price: 20.8 },
  { name: "一荤两素套餐", meat: 1, veg: 2, price: 15.8 },
  { name: "一荤一素套餐", meat: 1, veg: 1, price: 14.8 },
  { name: "两荤套餐", meat: 2, veg: 0, price: 18.8 },
  { name: "两素套餐", meat: 0, veg: 2, price: 9.9 },
  { name: "两荤两素套餐", meat: 2, veg: 2, price: 22.8 },
  { name: "三素套餐", meat: 0, veg: 3, price: 11.8 },
  { name: "三荤套餐", meat: 3, veg: 0, price: 26.8 }
];

function normalizePricingConfig(config = {}) {
  const comboRules = (config.comboRules || config.pricing_rules || PACKAGE_COMBOS)
    .map((rule) => ({
      name: String(rule.name || "").trim(),
      meat: Number(rule.meat !== undefined ? rule.meat : (rule.meat_count !== undefined ? rule.meat_count : 0)),
      veg: Number(rule.veg !== undefined ? rule.veg : (rule.veg_count !== undefined ? rule.veg_count : 0)),
      price: Number(rule.price || 0)
    }))
    .filter((rule) => rule.name && rule.price >= 0 && (rule.meat > 0 || rule.veg > 0));
  return {
    comboRules: comboRules.length ? comboRules : PACKAGE_COMBOS,
    extraRicePrice: Number(
      config.extraRicePrice !== undefined ? config.extraRicePrice : (config.extra_rice_price !== undefined ? config.extra_rice_price : 2)
    )
  };
}

function buildBestComboPlan(meatUnits, vegUnits, comboRules = PACKAGE_COMBOS) {
  const meatCount = meatUnits.length;
  const vegCount = vegUnits.length;
  const dp = Array.from({ length: meatCount + 1 }, () => Array(vegCount + 1).fill(Number.POSITIVE_INFINITY));
  const choice = Array.from({ length: meatCount + 1 }, () => Array(vegCount + 1).fill(null));
  dp[0][0] = 0;

  for (let currentMeat = 0; currentMeat <= meatCount; currentMeat += 1) {
    for (let currentVeg = 0; currentVeg <= vegCount; currentVeg += 1) {
      if (!Number.isFinite(dp[currentMeat][currentVeg])) {
        continue;
      }
      comboRules.forEach((combo) => {
        const nextMeat = currentMeat + combo.meat;
        const nextVeg = currentVeg + combo.veg;
        if (nextMeat > meatCount || nextVeg > vegCount) {
          return;
        }
        const nextCost = Number((dp[currentMeat][currentVeg] + combo.price).toFixed(2));
        if (nextCost < dp[nextMeat][nextVeg]) {
          dp[nextMeat][nextVeg] = nextCost;
          choice[nextMeat][nextVeg] = {
            prevMeat: currentMeat,
            prevVeg: currentVeg,
            combo
          };
        }
      });
    }
  }

  if (!Number.isFinite(dp[meatCount][vegCount])) {
    return { matched: false, comboLines: [], comboTotal: 0 };
  }

  const comboLines = [];
  let cursorMeat = meatCount;
  let cursorVeg = vegCount;
  let allocatedMeat = meatUnits.length;
  let allocatedVeg = vegUnits.length;
  while (cursorMeat || cursorVeg) {
    const current = choice[cursorMeat][cursorVeg];
    if (!current) {
      break;
    }
    const bundleMeat = meatUnits.slice(allocatedMeat - current.combo.meat, allocatedMeat);
    const bundleVeg = vegUnits.slice(allocatedVeg - current.combo.veg, allocatedVeg);
    allocatedMeat -= current.combo.meat;
    allocatedVeg -= current.combo.veg;
    comboLines.push({
      name: current.combo.name,
      price: current.combo.price,
      items: bundleMeat.concat(bundleVeg)
    });
    cursorMeat = current.prevMeat;
    cursorVeg = current.prevVeg;
  }
  comboLines.reverse();
  return {
    matched: true,
    comboLines,
    comboTotal: Number(dp[meatCount][vegCount].toFixed(2))
  };
}

function inferCompletionHint(meatCount, vegCount, comboRules) {
  if (!meatCount && !vegCount) {
    return "";
  }
  let best = null;
  const maxExtraMeat = Math.max(...comboRules.map((rule) => rule.meat), 1) * 3;
  const maxExtraVeg = Math.max(...comboRules.map((rule) => rule.veg), 1) * 3;

  for (let extraMeat = 0; extraMeat <= maxExtraMeat; extraMeat += 1) {
    for (let extraVeg = 0; extraVeg <= maxExtraVeg; extraVeg += 1) {
      if (extraMeat === 0 && extraVeg === 0) {
        continue;
      }
      const mockMeatUnits = Array.from({ length: meatCount + extraMeat }, (_, index) => ({ name: `M${index}` }));
      const mockVegUnits = Array.from({ length: vegCount + extraVeg }, (_, index) => ({ name: `V${index}` }));
      const matched = buildBestComboPlan(mockMeatUnits, mockVegUnits, comboRules).matched;
      if (!matched) {
        continue;
      }
      const totalExtra = extraMeat + extraVeg;
      if (
        !best
        || totalExtra < best.totalExtra
        || (totalExtra === best.totalExtra && extraVeg < best.extraVeg)
      ) {
        best = { extraMeat, extraVeg, totalExtra };
      }
    }
  }

  if (!best) {
    return "当前组合还不能结算，请继续补齐荤素搭配";
  }
  const parts = [];
  if (best.extraMeat) {
    parts.push(`${best.extraMeat} 个荤菜`);
  }
  if (best.extraVeg) {
    parts.push(`${best.extraVeg} 个素菜`);
  }
  return `当前还差 ${parts.join("、")} 才能组成可结算套餐`;
}

function buildPricingPreview(cart, config = {}) {
  const pricingConfig = normalizePricingConfig(config);
  const meatUnits = [];
  const vegUnits = [];
  const sideLines = [];
  let selectedCount = 0;

  (cart || []).forEach((item) => {
    selectedCount += item.quantity || 0;
    if (item.dish_kind === "meat" || item.dish_kind === "veg") {
      for (let index = 0; index < item.quantity; index += 1) {
        const unit = { name: item.name, product_id: item.product_id };
        if (item.dish_kind === "meat") {
          meatUnits.push(unit);
        } else {
          vegUnits.push(unit);
        }
      }
      return;
    }
    sideLines.push({
      name: item.name,
      quantity: item.quantity,
      amount: Number((((item.dish_kind === "rice" ? pricingConfig.extraRicePrice : (item.price_amount || 0))) * item.quantity).toFixed(2))
    });
  });

  const comboPlan = buildBestComboPlan(meatUnits, vegUnits, pricingConfig.comboRules);
  const hasComboSelection = meatUnits.length > 0 || vegUnits.length > 0;
  const hasCompleteCombo = comboPlan.matched && comboPlan.comboLines.length > 0;
  const sideTotal = sideLines.reduce((sum, item) => sum + item.amount, 0);
  const total = Number(((hasCompleteCombo ? comboPlan.comboTotal : 0) + sideTotal).toFixed(2));
  const missingHint = hasCompleteCombo
    ? ""
    : inferCompletionHint(meatUnits.length, vegUnits.length, pricingConfig.comboRules);

  return {
    matched: hasCompleteCombo,
    selectedCount,
    comboLines: comboPlan.comboLines,
    sideLines,
    comboTotal: comboPlan.comboTotal,
    sideTotal: Number(sideTotal.toFixed(2)),
    totalAmount: total,
    missingHint,
    summaryText: hasCompleteCombo
      ? `已匹配 ${comboPlan.comboLines.length} 组套餐，可直接去核对下单`
      : hasComboSelection
        ? missingHint || "当前组合还不能结算，请继续补齐荤素搭配"
        : sideLines.length
          ? "至少补齐一组可结算套餐"
          : "先从菜单里选择菜品",
    checkoutReady: hasCompleteCombo
  };
}

module.exports = {
  buildPricingPreview,
  normalizePricingConfig
};
