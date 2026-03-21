PACKAGE_PRICE_RULES = {
    (0, 2): 9.9,
    (0, 3): 11.8,
    (1, 1): 14.8,
    (1, 2): 15.8,
    (2, 0): 18.8,
    (2, 1): 20.8,
    (2, 2): 22.8,
    (3, 0): 26.8,
}


def infer_package_counts_from_name(name: str) -> tuple[int, int]:
    if "三荤" in name:
        return 3, 0
    if "两荤两素" in name:
        return 2, 2
    if "两荤一素" in name:
        return 2, 1
    if "两荤套餐" in name:
        return 2, 0
    if "一荤两素" in name:
        return 1, 2
    if "一荤一素" in name:
        return 1, 1
    if "两素套餐" in name:
        return 0, 2
    if "三素" in name:
        return 0, 3
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
    return PACKAGE_PRICE_RULES.get((meat_count, veg_count), fallback_price)
