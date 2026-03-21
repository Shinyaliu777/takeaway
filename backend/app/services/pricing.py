DEFAULT_PACKAGE_COMBOS = [
    {"name": "两荤一素套餐", "meat": 2, "veg": 1, "price": 20.8},
    {"name": "一荤两素套餐", "meat": 1, "veg": 2, "price": 15.8},
    {"name": "一荤一素套餐", "meat": 1, "veg": 1, "price": 14.8},
    {"name": "两荤套餐", "meat": 2, "veg": 0, "price": 18.8},
    {"name": "两素套餐", "meat": 0, "veg": 2, "price": 9.9},
    {"name": "两荤两素套餐", "meat": 2, "veg": 2, "price": 22.8},
    {"name": "三素套餐", "meat": 0, "veg": 3, "price": 11.8},
    {"name": "三荤套餐", "meat": 3, "veg": 0, "price": 26.8},
]

EXTRA_RICE_PRICE = 2.0


def infer_package_counts_from_name(name: str) -> tuple[int, int]:
    for combo in DEFAULT_PACKAGE_COMBOS:
        if combo["name"] == name:
            return combo["meat"], combo["veg"]
    return 0, 0


def infer_package_counts_from_option_groups(option_groups: list[dict]) -> tuple[int, int]:
    meat_count = 0
    veg_count = 0
    for group in option_groups or []:
        group_name = (group.get("group_name") or "").strip()
        if group_name.startswith("荤菜"):
            meat_count += 1
        elif group_name.startswith("素菜"):
            veg_count += 1
    return meat_count, veg_count


def compute_package_price(name: str, option_groups: list[dict] | None = None, fallback_price: float = 0.0) -> float:
    meat_count, veg_count = infer_package_counts_from_option_groups(option_groups or [])
    if not meat_count and not veg_count:
        meat_count, veg_count = infer_package_counts_from_name(name)
    for combo in DEFAULT_PACKAGE_COMBOS:
        if combo["meat"] == meat_count and combo["veg"] == veg_count:
            return combo["price"]
    return fallback_price


def normalize_package_rules(rules: list[dict] | None = None) -> list[dict]:
    normalized = []
    for rule in (rules or DEFAULT_PACKAGE_COMBOS):
        normalized.append(
            {
                "name": str(rule.get("name") or "").strip(),
                "meat": int(rule.get("meat") or rule.get("meat_count") or 0),
                "veg": int(rule.get("veg") or rule.get("veg_count") or 0),
                "price": round(float(rule.get("price") or 0), 2),
                "sort_order": int(rule.get("sort_order") or 0),
            }
        )
    return [rule for rule in normalized if rule["name"] and rule["price"] >= 0 and (rule["meat"] > 0 or rule["veg"] > 0)]


def build_best_combo_plan(meat_units: list[dict], veg_units: list[dict], rules: list[dict] | None = None) -> dict:
    package_rules = normalize_package_rules(rules)
    meat_count = len(meat_units)
    veg_count = len(veg_units)
    infinity = float("inf")
    dp = [[infinity] * (veg_count + 1) for _ in range(meat_count + 1)]
    choice = [[None] * (veg_count + 1) for _ in range(meat_count + 1)]
    dp[0][0] = 0.0

    for current_meat in range(meat_count + 1):
        for current_veg in range(veg_count + 1):
            if dp[current_meat][current_veg] == infinity:
                continue
            for combo in package_rules:
                next_meat = current_meat + combo["meat"]
                next_veg = current_veg + combo["veg"]
                if next_meat > meat_count or next_veg > veg_count:
                    continue
                next_cost = round(dp[current_meat][current_veg] + combo["price"], 2)
                if next_cost < dp[next_meat][next_veg]:
                    dp[next_meat][next_veg] = next_cost
                    choice[next_meat][next_veg] = (current_meat, current_veg, combo)

    if dp[meat_count][veg_count] == infinity:
        return {
            "matched": False,
            "combo_lines": [],
            "combo_total": 0.0,
        }

    combo_lines = []
    cursor_meat = meat_count
    cursor_veg = veg_count
    allocated_meat = len(meat_units)
    allocated_veg = len(veg_units)
    while cursor_meat or cursor_veg:
        previous = choice[cursor_meat][cursor_veg]
        if previous is None:
            break
        prev_meat, prev_veg, combo = previous
        bundle_meat = meat_units[allocated_meat - combo["meat"]:allocated_meat]
        bundle_veg = veg_units[allocated_veg - combo["veg"]:allocated_veg]
        allocated_meat -= combo["meat"]
        allocated_veg -= combo["veg"]
        combo_lines.append(
            {
                "name": combo["name"],
                "price": combo["price"],
                "meat_count": combo["meat"],
                "veg_count": combo["veg"],
                "items": bundle_meat + bundle_veg,
            }
        )
        cursor_meat = prev_meat
        cursor_veg = prev_veg

    combo_lines.reverse()
    return {
        "matched": True,
        "combo_lines": combo_lines,
        "combo_total": round(dp[meat_count][veg_count], 2),
    }
