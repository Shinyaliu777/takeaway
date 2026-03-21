from datetime import datetime, timedelta
import hashlib
import json

from sqlmodel import Session, select

from app.core.config import PUBLIC_BASE_URL
from app.models.entities import (
    Category,
    ComboRule,
    MerchantMessage,
    MerchantUser,
    Order,
    OrderItem,
    PaymentOrder,
    Product,
    Shop,
    User,
    UserAddress,
    UserMessage,
)
from app.services.pricing import EXTRA_RICE_PRICE


DESIRED_NOTICE = (
    "价格均为马币并按套餐价付款；午餐配送 10:45-13:45，晚餐配送 16:45-18:45。"
    "KK 宿舍仅限午餐配送，校内仅配送主图、工程学院和医学院。"
    "付款后请及时把截图发群里或私信客服，送达后请尽快取餐。"
)

MEAT_PRODUCTS = [
    ("土豆焖鸡", 80, "product-curry-chicken.png", "招牌荤菜，可重复选择，系统会自动匹配套餐价。"),
    ("小炒肉", 80, "product-bowl-dark.png", "经典下饭荤菜，可与其他荤素菜自由组合。"),
    ("香菇鸡", 80, "product-curry-chicken.png", "家常风味荤菜，可重复选。"),
    ("辣子鸡", 80, "product-curry-chicken.png", "偏香辣口味，适合重口用户。"),
    ("黑椒牛肉", 70, "product-bowl-dark.png", "黑椒风味荤菜，搭配套餐自动计价。"),
    ("红烧肉", 70, "product-bowl-dark.png", "高频点单荤菜，可重复选择。"),
]

VEG_PRODUCTS = [
    ("手撕包菜", 90, "product-fries.png", "清爽素菜，搭配荤菜更均衡。"),
    ("清炒生菜", 90, "product-fries.png", "常规素菜，适合轻口味。"),
    ("番茄炒蛋", 90, "product-fries.png", "偏家常口味，计入素菜数量。"),
    ("炒豆角", 90, "product-fries.png", "常规素菜，可与其他素菜自由搭配。"),
    ("炒土豆丝", 90, "product-fries.png", "热门素菜，可重复选。"),
    ("麻婆豆腐", 90, "product-fries.png", "下饭素菜，按素菜组合计价。"),
]

RICE_PRODUCTS = [
    ("额外米饭", EXTRA_RICE_PRICE, 160, "product-chicken-rice.png", "套餐默认含一份米饭，这里是额外加饭，每份 2 MYR。"),
]

SIDE_PRODUCTS = [
    ("手工馒头", 1.5, 120, "product-milk-tea.png", "单点主食，不含在套餐里。"),
    ("桂花馒头", 3.5, 80, "product-milk-tea.png", "单点主食，不含在套餐里。"),
    ("五黑馒头", 3.5, 80, "product-milk-tea.png", "单点主食，不含在套餐里。"),
    ("脆皮酥饼", 3.0, 90, "product-fries.png", "单点主食，不含在套餐里。"),
]

DEFAULT_COMBO_RULES = [
    ("两荤一素套餐", 2, 1, 20.8, 1),
    ("一荤两素套餐", 1, 2, 15.8, 2),
    ("一荤一素套餐", 1, 1, 14.8, 3),
    ("两荤套餐", 2, 0, 18.8, 4),
    ("两素套餐", 0, 2, 9.9, 5),
    ("两荤两素套餐", 2, 2, 22.8, 6),
    ("三素套餐", 0, 3, 11.8, 7),
    ("三荤套餐", 3, 0, 26.8, 8),
]


def ensure_operational_menu(session: Session, shop: Shop, asset_base: str, asset_version: str) -> bool:
    updated = False
    if (shop.name or "").strip() in {"Liuxu 测试餐厅", "小黎的神秘小厨房"} or "演示" in (shop.notice or ""):
        shop.name = "小黎的神秘小厨房"
        shop.notice = DESIRED_NOTICE
        shop.business_hours = "10:45-18:45"
        shop.extra_rice_price = EXTRA_RICE_PRICE
        session.add(shop)
        updated = True
    elif float(shop.extra_rice_price or 0) <= 0:
        shop.extra_rice_price = EXTRA_RICE_PRICE
        session.add(shop)
        updated = True

    existing_combo_rules = session.exec(select(ComboRule).order_by(ComboRule.sort_order, ComboRule.id)).all()
    if not existing_combo_rules:
        for name, meat_count, veg_count, price, sort_order in DEFAULT_COMBO_RULES:
            session.add(
                ComboRule(
                    name=name,
                    meat_count=meat_count,
                    veg_count=veg_count,
                    price=price,
                    sort_order=sort_order,
                    enabled=True,
                )
            )
        updated = True

    categories = session.exec(select(Category).order_by(Category.sort_order, Category.id)).all()
    category_map = {category.name: category for category in categories}

    desired_categories = [
        ("荤菜", 1),
        ("素菜", 2),
        ("加点主食", 3),
    ]
    for name, sort_order in desired_categories:
        category = category_map.get(name)
        if not category:
            category = Category(name=name, sort_order=sort_order, status=True)
            session.add(category)
            session.commit()
            session.refresh(category)
            category_map[name] = category
            updated = True
        else:
            if category.sort_order != sort_order or category.status is not True:
                category.sort_order = sort_order
                category.status = True
                session.add(category)
                updated = True

    for category in categories:
        if category.name in {"主食", "小吃", "饮品"} and category.status:
            category.status = False
            session.add(category)
            updated = True

    desired_product_names = {row[0] for row in MEAT_PRODUCTS + VEG_PRODUCTS + RICE_PRODUCTS + SIDE_PRODUCTS}
    existing_products = session.exec(select(Product)).all()
    existing_map = {product.name: product for product in existing_products}

    for product in existing_products:
        if product.name not in desired_product_names and product.sale_status:
            product.sale_status = False
            session.add(product)
            updated = True

    meat_category_id = category_map["荤菜"].id
    veg_category_id = category_map["素菜"].id
    staple_category_id = category_map["加点主食"].id
    for name, stock, image_name, description in MEAT_PRODUCTS:
        product = existing_map.get(name)
        image_url = f"{asset_base}/{image_name}?{asset_version}"
        option_groups_json = "[]"
        if not product:
            session.add(
                Product(
                    category_id=meat_category_id,
                    name=name,
                    image_url=image_url,
                    description=description,
                    option_groups_json=option_groups_json,
                    price_amount=0,
                    stock_qty=stock,
                    sale_status=True,
                )
            )
            updated = True
            continue
        if (
            product.category_id != meat_category_id
            or product.price_amount != 0
            or product.stock_qty != stock
            or product.image_url != image_url
            or product.description != description
            or product.option_groups_json != option_groups_json
            or product.sale_status is not True
        ):
            product.category_id = meat_category_id
            product.price_amount = 0
            product.stock_qty = stock
            product.image_url = image_url
            product.description = description
            product.option_groups_json = option_groups_json
            product.sale_status = True
            session.add(product)
            updated = True

    for name, stock, image_name, description in VEG_PRODUCTS:
        product = existing_map.get(name)
        image_url = f"{asset_base}/{image_name}?{asset_version}"
        if not product:
            session.add(
                Product(
                    category_id=veg_category_id,
                    name=name,
                    image_url=image_url,
                    description=description,
                    option_groups_json="[]",
                    price_amount=0,
                    stock_qty=stock,
                    sale_status=True,
                )
            )
            updated = True
            continue
        if (
            product.category_id != veg_category_id
            or product.price_amount != 0
            or product.stock_qty != stock
            or product.image_url != image_url
            or product.description != description
            or product.option_groups_json != "[]"
            or product.sale_status is not True
        ):
            product.category_id = veg_category_id
            product.price_amount = 0
            product.stock_qty = stock
            product.image_url = image_url
            product.description = description
            product.option_groups_json = "[]"
            product.sale_status = True
            session.add(product)
            updated = True

    for name, price, stock, image_name, description in RICE_PRODUCTS + SIDE_PRODUCTS:
        product = existing_map.get(name)
        image_url = f"{asset_base}/{image_name}?{asset_version}"
        if not product:
            session.add(
                Product(
                    category_id=staple_category_id,
                    name=name,
                    image_url=image_url,
                    description=description,
                    option_groups_json="[]",
                    price_amount=price,
                    stock_qty=stock,
                    sale_status=True,
                )
            )
            updated = True
            continue
        if (
            product.category_id != staple_category_id
            or product.price_amount != price
            or product.stock_qty != stock
            or product.image_url != image_url
            or product.description != description
            or product.option_groups_json != "[]"
            or product.sale_status is not True
        ):
            product.category_id = staple_category_id
            product.price_amount = price
            product.stock_qty = stock
            product.image_url = image_url
            product.description = description
            product.option_groups_json = "[]"
            product.sale_status = True
            session.add(product)
            updated = True

    return updated


def seed_data(session: Session) -> None:
    asset_base = f"{PUBLIC_BASE_URL.rstrip('/')}/uploads"
    asset_version = "v3"
    if session.exec(select(Shop)).first():
        merchant = session.exec(select(MerchantUser).where(MerchantUser.username == "admin")).first()
        if merchant and len(merchant.password) != 64:
            merchant.password = hashlib.sha256(merchant.password.encode("utf-8")).hexdigest()
            session.add(merchant)
            session.commit()
        products = session.exec(select(Product)).all()
        image_seed_map = {
            "招牌鸡饭": "product-chicken-rice.png",
            "椰浆饭": "product-nasi-lemak.png",
            "咖喱鸡饭": "product-curry-chicken.png",
            "黑椒牛肉饭": "product-bowl-dark.png",
            "照烧鸡排饭": "product-bowl-dark.png",
            "香辣炸鸡饭": "product-curry-chicken.png",
            "薯条": "product-fries.png",
            "鸡米花": "product-fries.png",
            "洋葱圈": "product-fries.png",
            "炸春卷": "product-fries.png",
            "咖喱角": "product-fries.png",
            "奶茶": "product-milk-tea.png",
            "柠檬茶": "product-milk-tea.png",
            "美式咖啡": "product-coffee.png",
            "拿铁": "product-coffee.png",
            "可乐": "product-coffee.png",
        }
        description_map = {
            "招牌鸡饭": "慢火鸡腿肉配香米和秘制酱汁，口感饱满，是店里最稳的招牌单品。",
            "椰浆饭": "马来西亚经典外卖单品，椰香米饭搭配配菜，整体层次更丰富。",
            "咖喱鸡饭": "马来风味咖喱浓郁顺滑，鸡肉入味，适合喜欢厚重口感的用户。",
            "黑椒牛肉饭": "现炒黑椒牛肉配热米饭，带明显锅气和黑椒香。",
            "照烧鸡排饭": "厚切鸡排煎烤后刷照烧汁，甜咸平衡，适合大众口味。",
            "香辣炸鸡饭": "外脆内嫩的炸鸡配辣味酱，满足感更强。",
            "薯条": "现炸粗薯，外层微脆，适合与主食搭配。",
            "鸡米花": "一口大小的香脆鸡肉粒，适合分享。",
            "洋葱圈": "裹粉炸制，入口带轻微甜香。",
            "炸春卷": "外皮酥脆，内馅饱满，适合作为加点小食。",
            "咖喱角": "经典马来小吃，酥皮和咖喱内馅层次分明。",
            "奶茶": "茶香和奶味更平衡，适合搭配重口主食。",
            "柠檬茶": "清爽解腻，冰饮体验更好。",
            "美式咖啡": "干净直接的咖啡风味，适合午间提神。",
            "拿铁": "牛奶比例更高，口感顺滑。",
            "可乐": "经典冰爽碳酸饮料。",
        }
        updated = False
        shop = session.exec(select(Shop)).first()
        if shop and (
            not (shop.logo_url or "").strip()
            or "/uploads/brand-store-logo.png" not in (shop.logo_url or "")
            or not (shop.logo_url or "").startswith(asset_base)
            or f"?{asset_version}" not in (shop.logo_url or "")
        ):
            shop.logo_url = f"{asset_base}/brand-store-logo.png?{asset_version}"
            session.add(shop)
            updated = True
        if shop and not hasattr(shop, "wechat_qr_url"):
            updated = True
        for product in products:
            asset_name = image_seed_map.get(product.name)
            if asset_name and (
                not (product.image_url or "").strip()
                or "picsum.photos" in (product.image_url or "")
                or "/uploads/product-" not in (product.image_url or "")
                or asset_name not in (product.image_url or "")
                or not (product.image_url or "").startswith(asset_base)
                or f"?{asset_version}" not in (product.image_url or "")
            ):
                product.image_url = f"{asset_base}/{asset_name}?{asset_version}"
                session.add(product)
                updated = True
            if not (product.description or "").strip():
                product.description = description_map.get(product.name, "现做现卖，适合外卖场景的热销单品。")
                session.add(product)
                updated = True
        if updated:
            session.commit()
        if not session.exec(select(UserMessage)).first():
            orders = session.exec(select(Order).where(Order.user_id == 1).order_by(Order.id.desc())).all()
            for order in orders[:3]:
                if order.order_status == "COMPLETED":
                    session.add(UserMessage(user_id=1, title="订单完成", content=f"订单 {order.order_no} 已完成，欢迎再次下单。"))
                elif order.order_status == "DELIVERING":
                    session.add(UserMessage(user_id=1, title="开始配送", content=f"订单 {order.order_no} 正在配送中，请留意电话。"))
                elif order.payment_status == "SUCCESS":
                    session.add(UserMessage(user_id=1, title="支付成功", content=f"订单 {order.order_no} 已支付成功。"))
            session.commit()
        if shop and ensure_operational_menu(session, shop, asset_base, asset_version):
            session.commit()
        return

    session.add(
        MerchantUser(
            username="admin",
            password=hashlib.sha256("admin123".encode("utf-8")).hexdigest(),
            display_name="测试商家"
        )
    )
    session.add(User(nickname="测试用户", avatar_url="", wechat_openid="demo-openid"))
    session.add(
        Shop(
            name="小黎的神秘小厨房",
            logo_url=f"{asset_base}/brand-store-logo.png?{asset_version}",
            wechat_qr_url="",
            alipay_qr_url="",
            tng_qr_url="",
            phone="+60 12-888 9999",
            address="Kuala Lumpur City Centre",
            notice=DESIRED_NOTICE,
            business_hours="10:45-18:45",
        )
    )
    session.commit()

    categories = [
        Category(name="荤菜", sort_order=1),
        Category(name="素菜", sort_order=2),
        Category(name="加点主食", sort_order=3),
    ]
    for category in categories:
        session.add(category)
    session.commit()

    saved_categories = session.exec(select(Category).order_by(Category.sort_order)).all()
    session.add_all([
        Product(
            category_id=saved_categories[0].id,
            name=name,
            image_url=f"{asset_base}/{image_name}?{asset_version}",
            description=description,
            option_groups_json="[]",
            price_amount=0,
            stock_qty=stock,
        )
        for name, stock, image_name, description in MEAT_PRODUCTS
    ])
    session.add_all([
        Product(
            category_id=saved_categories[1].id,
            name=name,
            image_url=f"{asset_base}/{image_name}?{asset_version}",
            description=description,
            option_groups_json="[]",
            price_amount=0,
            stock_qty=stock,
        )
        for name, stock, image_name, description in VEG_PRODUCTS
    ])
    session.add_all([
        Product(category_id=saved_categories[2].id, name=name, image_url=f"{asset_base}/{image_name}?{asset_version}", description=description, option_groups_json="[]", price_amount=price, stock_qty=stock)
        for name, price, stock, image_name, description in RICE_PRODUCTS + SIDE_PRODUCTS
    ])
    session.add_all(
        [
            UserAddress(
                user_id=1,
                receiver_name="张三",
                receiver_mobile="+60 11-1111 2222",
                detail_address="Block A, Jalan Ampang, Kuala Lumpur",
                is_default=True,
            ),
            UserAddress(
                user_id=1,
                receiver_name="李四",
                receiver_mobile="+60 12-3333 4444",
                detail_address="No. 8, Bukit Bintang, Kuala Lumpur",
                is_default=False,
            ),
        ]
    )
    session.commit()

    paid_created_at = datetime.utcnow() - timedelta(hours=2)
    paid_order = Order(
        order_no="ORD-DEMO-PAID-001",
        user_id=1,
        receiver_name="张三",
        receiver_mobile="+60 11-1111 2222",
        receiver_address="Block A, Jalan Ampang, Kuala Lumpur",
        total_amount=33.0,
        currency_code="MYR",
        order_status="PAID",
        payment_status="SUCCESS",
        created_at=paid_created_at,
        paid_at=paid_created_at + timedelta(minutes=5),
    )
    delivering_created_at = datetime.utcnow() - timedelta(hours=6)
    delivering_order = Order(
        order_no="ORD-DEMO-DELIVERING-001",
        user_id=1,
        receiver_name="李四",
        receiver_mobile="+60 12-3333 4444",
        receiver_address="No. 8, Bukit Bintang, Kuala Lumpur",
        total_amount=20.0,
        currency_code="MYR",
        order_status="DELIVERING",
        payment_status="SUCCESS",
        created_at=delivering_created_at,
        paid_at=delivering_created_at + timedelta(minutes=3),
        delivering_at=delivering_created_at + timedelta(minutes=15),
    )
    completed_created_at = datetime.utcnow() - timedelta(days=1)
    completed_order = Order(
        order_no="ORD-DEMO-COMPLETED-001",
        user_id=1,
        receiver_name="张三",
        receiver_mobile="+60 11-1111 2222",
        receiver_address="Block A, Jalan Ampang, Kuala Lumpur",
        total_amount=15.5,
        currency_code="MYR",
        order_status="COMPLETED",
        payment_status="SUCCESS",
        created_at=completed_created_at,
        paid_at=completed_created_at + timedelta(minutes=2),
        delivering_at=completed_created_at + timedelta(minutes=20),
        completed_at=completed_created_at + timedelta(minutes=45),
    )
    session.add_all([paid_order, delivering_order, completed_order])
    session.commit()

    products = session.exec(select(Product).order_by(Product.id)).all()
    orders = session.exec(select(Order).where(Order.order_no.like("ORD-DEMO-%")).order_by(Order.id)).all()
    session.add_all(
        [
            OrderItem(order_id=orders[0].id, product_id=products[0].id, product_name_snapshot=products[0].name, product_price_snapshot=18.0, quantity=1, line_amount=18.0),
            OrderItem(order_id=orders[0].id, product_id=products[2].id, product_name_snapshot=products[2].name, product_price_snapshot=8.0, quantity=1, line_amount=8.0),
            OrderItem(order_id=orders[0].id, product_id=products[3].id, product_name_snapshot=products[3].name, product_price_snapshot=7.0, quantity=1, line_amount=7.0),
            OrderItem(order_id=orders[1].id, product_id=products[1].id, product_name_snapshot=products[1].name, product_price_snapshot=20.0, quantity=1, line_amount=20.0),
            OrderItem(order_id=orders[2].id, product_id=products[1].id, product_name_snapshot=products[1].name, product_price_snapshot=15.5, quantity=1, line_amount=15.5),
        ]
    )
    session.add_all(
        [
            PaymentOrder(order_id=orders[0].id, payment_no="PAY-DEMO-PAID-001", channel_code="QR", amount=33.0, currency_code="MYR", status="SUCCESS", qr_code_url="https://example.com/pay/ORD-DEMO-PAID-001", paid_at=paid_order.paid_at, created_at=paid_order.created_at),
            PaymentOrder(order_id=orders[1].id, payment_no="PAY-DEMO-DELIVERING-001", channel_code="QR", amount=20.0, currency_code="MYR", status="SUCCESS", qr_code_url="https://example.com/pay/ORD-DEMO-DELIVERING-001", paid_at=delivering_order.paid_at, created_at=delivering_order.created_at),
            PaymentOrder(order_id=orders[2].id, payment_no="PAY-DEMO-COMPLETED-001", channel_code="QR", amount=15.5, currency_code="MYR", status="SUCCESS", qr_code_url="https://example.com/pay/ORD-DEMO-COMPLETED-001", paid_at=completed_order.paid_at, created_at=completed_order.created_at),
        ]
    )
    session.add_all(
        [
            MerchantMessage(title="新订单提醒", content=f"订单 {orders[0].order_no} 已支付，请及时处理。"),
            MerchantMessage(title="配送中订单", content=f"订单 {orders[1].order_no} 正在配送中。"),
            MerchantMessage(title="测试完成订单", content=f"订单 {orders[2].order_no} 已完成。"),
        ]
    )
    session.add_all(
        [
            UserMessage(user_id=1, title="支付成功", content=f"订单 {orders[0].order_no} 已支付成功。"),
            UserMessage(user_id=1, title="开始配送", content=f"订单 {orders[1].order_no} 正在配送中，请留意电话。"),
            UserMessage(user_id=1, title="订单完成", content=f"订单 {orders[2].order_no} 已完成，欢迎再次下单。"),
        ]
    )
    session.commit()
