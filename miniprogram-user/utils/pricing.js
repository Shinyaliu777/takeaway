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

function buildBestComboPlan(meatUnits, vegUnits) {
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
      PACKAGE_COMBOS.forEach((combo) => {
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

function buildPricingPreview(cart) {
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
      amount: Number(((item.price_amount || 0) * item.quantity).toFixed(2))
    });
  });

  const comboPlan = buildBestComboPlan(meatUnits, vegUnits);
  const hasComboSelection = meatUnits.length > 0 || vegUnits.length > 0;
  const hasCompleteCombo = comboPlan.matched && comboPlan.comboLines.length > 0;
  const sideTotal = sideLines.reduce((sum, item) => sum + item.amount, 0);
  const total = Number(((hasCompleteCombo ? comboPlan.comboTotal : 0) + sideTotal).toFixed(2));

  return {
    matched: hasCompleteCombo,
    selectedCount,
    comboLines: comboPlan.comboLines,
    sideLines,
    comboTotal: comboPlan.comboTotal,
    sideTotal: Number(sideTotal.toFixed(2)),
    totalAmount: total,
    summaryText: hasCompleteCombo
      ? `${comboPlan.comboLines.length} 组套餐已匹配，可继续加主食或直接结算`
      : hasComboSelection
        ? "当前组合还不能结算，请继续补齐荤素搭配"
        : sideLines.length
          ? "至少选择一组可结算套餐"
          : "先从菜单里选择菜品",
    checkoutReady: hasCompleteCombo
  };
}

module.exports = {
  buildPricingPreview
};
