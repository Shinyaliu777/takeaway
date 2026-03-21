import json
import base64
import hashlib
import hmac
from pathlib import Path
from urllib.parse import urlencode
from urllib.error import URLError
from urllib.request import Request as UrlRequest, urlopen
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Request as FastAPIRequest, UploadFile
from fastapi.encoders import jsonable_encoder
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from sqlmodel import Session, select

from app.core.config import (
    DEFAULT_CURRENCY,
    IMAGE_UPLOAD_MAX_BYTES,
    MERCHANT_TOKEN_PREFIX,
    PUBLIC_BASE_URL,
    TOKEN_SIGNING_SECRET,
    USER_TOKEN_PREFIX,
    UPLOAD_DIR,
    WECHAT_APP_ID,
    WECHAT_APP_SECRET,
)
from app.db.session import get_session
from app.models.entities import (
    Category,
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
from app.schemas.contracts import (
    AddressCreate,
    CategoryPayload,
    MerchantLoginPayload,
    MerchantOrderStatusUpdate,
    OrderCreate,
    ProductPayload,
    ShopUpdatePayload,
    UserLoginPayload,
    UserProfileUpdatePayload,
)
from app.services.pricing import EXTRA_RICE_PRICE, build_best_combo_plan

router = APIRouter()
WECHAT_ACCESS_TOKEN_CACHE = {"token": "", "expires_at": 0.0}


def _encode_signed_token(prefix: str, subject_id: int) -> str:
    payload = f"{prefix}:{subject_id}"
    signature = hmac.new(
        TOKEN_SIGNING_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def _decode_signed_token(raw_token: str, expected_prefix: str) -> int:
    try:
        decoded = base64.urlsafe_b64decode(raw_token.encode("utf-8")).decode("utf-8")
        prefix, subject_id, signature = decoded.split(":", 2)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if prefix != expected_prefix:
        raise HTTPException(status_code=401, detail="Invalid token")
    expected_signature = hmac.new(
        TOKEN_SIGNING_SECRET.encode("utf-8"),
        f"{prefix}:{subject_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        return int(subject_id)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def build_user_token(user_id: int) -> str:
    return _encode_signed_token(USER_TOKEN_PREFIX, user_id)


def build_merchant_token(merchant_id: int) -> str:
    return _encode_signed_token(MERCHANT_TOKEN_PREFIX, merchant_id)


def require_merchant(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> MerchantUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing merchant token")
    token = authorization.replace("Bearer ", "", 1)
    merchant_id = _decode_signed_token(token, MERCHANT_TOKEN_PREFIX)
    merchant = session.get(MerchantUser, merchant_id)
    if not merchant:
        raise HTTPException(status_code=401, detail="Merchant not found")
    return merchant


def require_user(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing user token")
    token = authorization.replace("Bearer ", "", 1)
    user_id = _decode_signed_token(token, USER_TOKEN_PREFIX)
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def dump(model):
    if isinstance(model, list):
        return [dump(item) for item in model]
    if isinstance(model, Shop):
        payload = jsonable_encoder(model)
        payload["featured_cards"] = parse_json_field(model.featured_cards_json)
        return payload
    if isinstance(model, Product):
        payload = jsonable_encoder(model)
        payload["option_groups"] = parse_json_field(model.option_groups_json)
        payload["price_amount"] = resolve_product_price(model)
        return payload
    if isinstance(model, OrderItem):
        payload = jsonable_encoder(model)
        payload["selected_options"] = parse_json_field(model.selected_options_json)
        return payload
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return jsonable_encoder(model)


def parse_json_field(raw_value: str):
    if not raw_value:
        return []
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return []


def resolve_product_price(product: Product) -> float:
    return product.price_amount


def get_category_map(session: Session) -> dict[int, Category]:
    categories = session.exec(select(Category)).all()
    return {category.id: category for category in categories}


def infer_product_kind(product: Product, category_map: dict[int, Category]) -> str:
    category_name = ((category_map.get(product.category_id) or Category(name="")).name or "").strip()
    if "荤" in category_name:
        return "meat"
    if "素" in category_name:
        return "veg"
    if "米饭" in product.name:
        return "rice"
    return "side"


def serialize_product(product: Product, category_map: dict[int, Category]) -> dict:
    payload = dump(product)
    payload["dish_kind"] = infer_product_kind(product, category_map)
    payload["category_name"] = ((category_map.get(product.category_id) or Category(name="")).name or "").strip()
    return payload


def build_cart_item_label(product: Product, selected_options: list[dict]) -> str:
    if not selected_options:
        return product.name
    chosen = " / ".join(
        f"{item.get('group_name', '').strip()}:{item.get('option_name', '').strip()}"
        for item in selected_options
        if item.get("group_name") and item.get("option_name")
    )
    return f"{product.name}（{chosen}）" if chosen else product.name


def validate_selected_options(product: Product, selected_options: list[dict]) -> list[dict]:
    option_groups = parse_json_field(product.option_groups_json)
    if not option_groups:
        return []
    if not isinstance(selected_options, list):
        raise HTTPException(status_code=400, detail=f"Missing selections for {product.name}")

    validated = []
    selected_map = {}
    for item in selected_options:
        if not isinstance(item, dict):
            continue
        group_name = (item.get("group_name") or "").strip()
        option_name = (item.get("option_name") or "").strip()
        if group_name and option_name:
            selected_map[group_name] = option_name

    for group in option_groups:
        group_name = (group.get("group_name") or "").strip()
        options = group.get("options") or []
        required = bool(group.get("required", True))
        chosen = (selected_map.get(group_name) or "").strip()
        if required and not chosen:
            raise HTTPException(status_code=400, detail=f"Please choose {group_name} for {product.name}")
        if chosen and chosen not in options:
            raise HTTPException(status_code=400, detail=f"Invalid choice for {group_name} in {product.name}")
        if chosen:
            validated.append({"group_name": group_name, "option_name": chosen})
    return validated


def sanitize_merchant(merchant: MerchantUser) -> dict:
    return {
        "id": merchant.id,
        "username": merchant.username,
        "display_name": merchant.display_name,
    }


def create_user_message(session: Session, user_id: int, title: str, content: str):
    session.add(UserMessage(user_id=user_id, title=title, content=content))


def create_merchant_message(session: Session, title: str, content: str):
    session.add(MerchantMessage(title=title, content=content))


def build_order_user_summary(session: Session, order: Order) -> dict:
    user = session.get(User, order.user_id)
    order_count = len(session.exec(select(Order).where(Order.user_id == order.user_id)).all())
    fallback_name = (order.receiver_name or "").strip()
    nickname = (user.nickname if user else "").strip() or fallback_name or f"用户#{order.user_id}"
    mobile = (user.mobile if user else "").strip() or (order.receiver_mobile or "").strip()
    mobile_tail = mobile[-4:] if len(mobile) >= 4 else mobile
    return {
        "user_nickname": user.nickname if user else "",
        "user_avatar_url": user.avatar_url if user else "",
        "user_mobile": mobile,
        "user_mobile_tail": mobile_tail,
        "user_display_name": nickname,
        "user_order_count": order_count,
        "is_repeat_customer": order_count > 1,
    }


def build_group_name(kind: str, index: int) -> str:
    if kind == "meat":
        return f"荤菜{index}"
    if kind == "veg":
        return f"素菜{index}"
    return f"菜品{index}"


def build_priced_order_lines(raw_items: list[tuple[Product, int]], category_map: dict[int, Category]) -> dict:
    meat_units = []
    veg_units = []
    side_lines = []

    for product, quantity in raw_items:
        kind = infer_product_kind(product, category_map)
        if kind in {"meat", "veg"}:
            for _ in range(quantity):
                unit = {"product_id": product.id, "name": product.name, "kind": kind}
                if kind == "meat":
                    meat_units.append(unit)
                else:
                    veg_units.append(unit)
            continue
        side_lines.append(
            {
                "product_id": product.id,
                "name": product.name,
                "quantity": quantity,
                "unit_price": product.price_amount,
                "line_amount": round(product.price_amount * quantity, 2),
                "selected_options": [],
            }
        )

    bundle_plan = build_best_combo_plan(meat_units, veg_units)
    if not bundle_plan["matched"] or not bundle_plan["combo_lines"]:
        raise HTTPException(status_code=400, detail="当前选菜还不能组成可结算套餐，请继续补齐荤素组合")

    pricing_lines = []
    for combo in bundle_plan["combo_lines"]:
        selected_options = []
        meat_index = 1
        veg_index = 1
        for item in combo["items"]:
            if item["kind"] == "meat":
                group_name = build_group_name("meat", meat_index)
                meat_index += 1
            else:
                group_name = build_group_name("veg", veg_index)
                veg_index += 1
            selected_options.append(
                {
                    "group_name": group_name,
                    "option_name": item["name"],
                    "product_id": item["product_id"],
                }
            )
        pricing_lines.append(
            {
                "product_id": 0,
                "name": combo["name"],
                "quantity": 1,
                "unit_price": combo["price"],
                "line_amount": combo["price"],
                "selected_options": selected_options,
            }
        )

    pricing_lines.extend(side_lines)
    total_amount = round(
        bundle_plan["combo_total"] + sum(item["line_amount"] for item in side_lines),
        2,
    )
    return {
        "lines": pricing_lines,
        "total_amount": total_amount,
    }


def save_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    filename = f"{uuid4().hex}{suffix.lower()}"
    target = UPLOAD_DIR / filename
    written = 0
    with target.open("wb") as output:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > IMAGE_UPLOAD_MAX_BYTES:
                output.close()
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Image is too large")
            output.write(chunk)
    return filename


def fetch_wechat_session(code: str) -> dict:
    if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
        raise HTTPException(status_code=503, detail="WeChat login is not configured")
    params = urlencode(
        {
            "appid": WECHAT_APP_ID,
            "secret": WECHAT_APP_SECRET,
            "js_code": code,
            "grant_type": "authorization_code",
        }
    )
    try:
        with urlopen(f"https://api.weixin.qq.com/sns/jscode2session?{params}", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise HTTPException(status_code=502, detail="Failed to reach WeChat API") from exc
    if payload.get("errcode"):
        raise HTTPException(status_code=400, detail=payload.get("errmsg", "WeChat login failed"))
    return payload


def get_wechat_access_token() -> str:
    if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
        raise HTTPException(status_code=503, detail="WeChat login is not configured")
    now_ts = datetime.utcnow().timestamp()
    if WECHAT_ACCESS_TOKEN_CACHE["token"] and WECHAT_ACCESS_TOKEN_CACHE["expires_at"] > now_ts + 60:
        return WECHAT_ACCESS_TOKEN_CACHE["token"]
    params = urlencode(
        {
            "grant_type": "client_credential",
            "appid": WECHAT_APP_ID,
            "secret": WECHAT_APP_SECRET,
        }
    )
    try:
        with urlopen(f"https://api.weixin.qq.com/cgi-bin/token?{params}", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise HTTPException(status_code=502, detail="Failed to reach WeChat API") from exc
    if payload.get("errcode") or not payload.get("access_token"):
        raise HTTPException(status_code=400, detail=payload.get("errmsg", "Failed to fetch WeChat access token"))
    WECHAT_ACCESS_TOKEN_CACHE["token"] = payload["access_token"]
    WECHAT_ACCESS_TOKEN_CACHE["expires_at"] = now_ts + int(payload.get("expires_in", 7200))
    return WECHAT_ACCESS_TOKEN_CACHE["token"]


def fetch_wechat_phone_number(phone_code: str) -> str:
    if not phone_code:
        return ""
    access_token = get_wechat_access_token()
    request = UrlRequest(
        f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access_token}",
        data=json.dumps({"code": phone_code}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise HTTPException(status_code=502, detail="Failed to reach WeChat API") from exc
    if payload.get("errcode"):
        raise HTTPException(status_code=400, detail=payload.get("errmsg", "Failed to fetch phone number"))
    phone_info = payload.get("phone_info") or {}
    return phone_info.get("phoneNumber") or ""


def decrypt_wechat_phone_number(session_key: str, encrypted_data: str, iv: str) -> str:
    if not session_key or not encrypted_data or not iv:
        return ""
    try:
        session_key_bytes = base64.b64decode(session_key)
        encrypted_bytes = base64.b64decode(encrypted_data)
        iv_bytes = base64.b64decode(iv)
        cipher = Cipher(algorithms.AES(session_key_bytes), modes.CBC(iv_bytes))
        decryptor = cipher.decryptor()
        padded = decryptor.update(encrypted_bytes) + decryptor.finalize()
        pad_length = padded[-1]
        data = padded[:-pad_length]
        payload = json.loads(data.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to decrypt phone number") from exc
    phone_info = payload.get("phoneNumber") or payload.get("purePhoneNumber") or ""
    return phone_info


def mark_order_paid(session: Session, order: Order, payment: PaymentOrder) -> None:
    if order.payment_status == "SUCCESS":
        return
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    stock_deductions: dict[int, int] = {}
    for item in items:
        selected_options = parse_json_field(item.selected_options_json)
        component_ids = [entry.get("product_id") for entry in selected_options if entry.get("product_id")]
        if component_ids:
            for product_id in component_ids:
                stock_deductions[product_id] = stock_deductions.get(product_id, 0) + 1
            continue
        if item.product_id > 0:
            stock_deductions[item.product_id] = stock_deductions.get(item.product_id, 0) + item.quantity
    for product_id, quantity in stock_deductions.items():
        product = session.get(Product, product_id)
        if not product or product.stock_qty < quantity:
            raise HTTPException(status_code=400, detail=f"Stock conflict for product {product_id}")
        product.stock_qty -= quantity
        session.add(product)

    paid_at = datetime.utcnow()
    payment.status = "SUCCESS"
    payment.paid_at = paid_at
    payment.reviewed_at = paid_at
    order.payment_status = "SUCCESS"
    order.order_status = "PAID"
    order.paid_at = paid_at
    session.add(payment)
    session.add(order)
    create_merchant_message(
        session,
        "订单已确认到账",
        f"订单 {order.order_no} 已由商家确认到账，可安排配送。",
    )
    create_user_message(session, order.user_id, "付款已确认", f"订单 {order.order_no} 付款截图已审核通过。")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/api/user/login")
def user_login(payload: UserLoginPayload, session: Session = Depends(get_session)):
    wechat_session = fetch_wechat_session(payload.code)
    openid = wechat_session.get("openid")
    phone_number = ""
    if payload.phone_code:
        phone_number = fetch_wechat_phone_number(payload.phone_code)
    elif payload.encrypted_data and payload.iv:
        phone_number = decrypt_wechat_phone_number(
            wechat_session.get("session_key", ""),
            payload.encrypted_data,
            payload.iv,
        )
    if not openid:
        raise HTTPException(status_code=400, detail="Missing openid from WeChat")
    user = session.exec(select(User).where(User.wechat_openid == openid)).first()
    if not user:
        user = User(
            nickname=payload.nickname,
            avatar_url=payload.avatar_url or "",
            mobile=phone_number,
            wechat_openid=openid,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.nickname = payload.nickname
        user.avatar_url = payload.avatar_url or user.avatar_url
        user.mobile = phone_number or user.mobile
        session.add(user)
        session.commit()
        session.refresh(user)
    return {"token": build_user_token(user.id), "user": dump(user)}


@router.get("/api/user/profile")
def user_profile(user: User = Depends(require_user)):
    return dump(user)


@router.patch("/api/user/profile")
def update_user_profile(
    payload: UserProfileUpdatePayload,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    user.nickname = payload.nickname.strip()
    user.avatar_url = (payload.avatar_url or "").strip()
    if payload.mobile is not None:
        user.mobile = payload.mobile.strip()
    session.add(user)
    session.commit()
    session.refresh(user)
    return dump(user)


@router.post("/api/merchant/uploads/image", dependencies=[Depends(require_merchant)])
def merchant_upload_image(request: FastAPIRequest, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image upload is supported")
    filename = save_upload(file)
    base_url = str(request.base_url).rstrip("/") or PUBLIC_BASE_URL.rstrip("/")
    return {"image_url": base_url + f"/uploads/{filename}"}


@router.post("/api/user/uploads/payment-proof")
def user_upload_payment_proof(
    request: FastAPIRequest,
    file: UploadFile = File(...),
    user: User = Depends(require_user),
):
    del user
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image upload is supported")
    filename = save_upload(file)
    base_url = str(request.base_url).rstrip("/") or PUBLIC_BASE_URL.rstrip("/")
    return {"image_url": base_url + f"/uploads/{filename}"}


@router.get("/api/shop")
def get_shop(session: Session = Depends(get_session)):
    shop = session.exec(select(Shop)).first()
    return dump(shop) if shop else None


@router.get("/api/categories")
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category).where(Category.status == True).order_by(Category.sort_order)).all()


@router.get("/api/products")
def get_products(session: Session = Depends(get_session)):
    category_map = get_category_map(session)
    products = session.exec(select(Product).where(Product.sale_status == True)).all()
    return [serialize_product(product, category_map) for product in products]


@router.get("/api/products/{product_id}")
def get_product_detail(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or not product.sale_status:
        raise HTTPException(status_code=404, detail="Product not found")
    category = session.get(Category, product.category_id)
    category_map = get_category_map(session)
    return {
        "product": serialize_product(product, category_map),
        "category": dump(category) if category else None,
    }


@router.get("/api/addresses")
def get_addresses(user: User = Depends(require_user), session: Session = Depends(get_session)):
    return session.exec(select(UserAddress).where(UserAddress.user_id == user.id)).all()


@router.post("/api/addresses")
def create_address(payload: AddressCreate, user: User = Depends(require_user), session: Session = Depends(get_session)):
    if payload.is_default:
        current_addresses = session.exec(select(UserAddress).where(UserAddress.user_id == user.id)).all()
        for address in current_addresses:
            address.is_default = False
            session.add(address)
    address = UserAddress(user_id=user.id, **payload.model_dump())
    session.add(address)
    session.commit()
    session.refresh(address)
    return address


@router.put("/api/addresses/{address_id}")
def update_address(address_id: int, payload: AddressCreate, user: User = Depends(require_user), session: Session = Depends(get_session)):
    address = session.get(UserAddress, address_id)
    if not address or address.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    if payload.is_default:
        current_addresses = session.exec(select(UserAddress).where(UserAddress.user_id == user.id)).all()
        for item in current_addresses:
            item.is_default = False
            session.add(item)
    for key, value in payload.model_dump().items():
        setattr(address, key, value)
    session.add(address)
    session.commit()
    session.refresh(address)
    return dump(address)


@router.delete("/api/addresses/{address_id}")
def delete_address(address_id: int, user: User = Depends(require_user), session: Session = Depends(get_session)):
    address = session.get(UserAddress, address_id)
    if not address or address.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    session.delete(address)
    session.commit()
    return {"message": "Address deleted"}


@router.get("/api/orders")
def get_user_orders(user: User = Depends(require_user), session: Session = Depends(get_session)):
    return session.exec(select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())).all()


@router.get("/api/orders/{order_id}")
def get_user_order_detail(order_id: int, user: User = Depends(require_user), session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    return {"order": dump(order), "items": dump(items), "payment": dump(payment)}


@router.get("/api/user/messages")
def get_user_messages(user: User = Depends(require_user), session: Session = Depends(get_session)):
    return session.exec(
        select(UserMessage).where(UserMessage.user_id == user.id).order_by(UserMessage.id.desc())
    ).all()


@router.patch("/api/user/messages/{message_id}/read")
def mark_user_message_read(message_id: int, user: User = Depends(require_user), session: Session = Depends(get_session)):
    message = session.get(UserMessage, message_id)
    if not message or message.user_id != user.id:
        raise HTTPException(status_code=404, detail="Message not found")
    message.read = True
    session.add(message)
    session.commit()
    session.refresh(message)
    return dump(message)


@router.post("/api/orders/{order_id}/payment-proof")
def submit_payment_proof(
    order_id: int,
    payload: dict,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    proof_image_url = (payload or {}).get("proof_image_url", "").strip()
    if not proof_image_url:
        raise HTTPException(status_code=400, detail="Missing payment proof image")
    if order.order_status in {"PAID", "DELIVERING", "COMPLETED"}:
        raise HTTPException(status_code=400, detail="Order payment already confirmed")
    payment.proof_image_url = proof_image_url
    payment.status = "PROOF_UPLOADED"
    order.payment_status = "PROOF_UPLOADED"
    order.order_status = "PAYMENT_REVIEW"
    session.add(payment)
    session.add(order)
    create_merchant_message(
        session,
        "待审核付款截图",
        f"订单 {order.order_no} 已上传付款截图，请尽快确认。",
    )
    create_user_message(session, order.user_id, "截图已提交", f"订单 {order.order_no} 已提交付款截图，等待商家确认。")
    session.commit()
    session.refresh(order)
    session.refresh(payment)
    return {"order": dump(order), "payment": dump(payment)}


@router.post("/api/orders/create")
def create_order(payload: OrderCreate, user: User = Depends(require_user), session: Session = Depends(get_session)):
    raw_items = []
    category_map = get_category_map(session)

    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for product {item.product_id}")
        product = session.get(Product, item.product_id)
        if not product or not product.sale_status:
            raise HTTPException(status_code=400, detail=f"Invalid product {item.product_id}")
        validate_selected_options(product, item.selected_options)
        if product.stock_qty < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        raw_items.append((product, item.quantity))

    pricing_result = build_priced_order_lines(raw_items, category_map)

    order = Order(
        order_no=f"ORD-{uuid4().hex[:10].upper()}",
        user_id=user.id,
        receiver_name=payload.receiver_name,
        receiver_mobile=payload.receiver_mobile,
        receiver_address=payload.receiver_address,
        total_amount=pricing_result["total_amount"],
        currency_code=DEFAULT_CURRENCY,
    )
    session.add(order)
    session.flush()

    for line in pricing_result["lines"]:
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=line["product_id"],
                product_name_snapshot=line["name"],
                product_price_snapshot=line["unit_price"],
                selected_options_json=json.dumps(line["selected_options"], ensure_ascii=False),
                quantity=line["quantity"],
                line_amount=line["line_amount"],
            )
        )

    payment = PaymentOrder(
        order_id=order.id,
        payment_no=f"PAY-{uuid4().hex[:10].upper()}",
        channel_code=payload.channel_code.upper(),
        amount=order.total_amount,
        status="UNPAID",
        qr_code_url=f"https://example.com/pay/{order.order_no}",
    )
    session.add(payment)
    session.commit()
    session.refresh(order)
    session.refresh(payment)

    return {
        "order": dump(order),
        "payment": dump(payment),
        "message": "Order created, waiting for payment proof upload",
    }


@router.post("/api/payments/mock-success/{order_id}", dependencies=[Depends(require_merchant)])
def mock_payment_success(order_id: int, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if order.payment_status == "SUCCESS":
        return {"message": "Order already paid", "order": order}
    mark_order_paid(session, order, payment)
    session.commit()
    session.refresh(order)
    return {"message": "Payment marked as success", "order": dump(order)}


@router.post("/api/merchant/login")
def merchant_login(payload: MerchantLoginPayload, session: Session = Depends(get_session)):
    password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()
    merchant = session.exec(
        select(MerchantUser).where(
        MerchantUser.username == payload.username,
        MerchantUser.password == password_hash,
        )
    ).first()
    if not merchant:
        raise HTTPException(status_code=401, detail="Invalid merchant credentials")
    return {"token": build_merchant_token(merchant.id), "merchant": sanitize_merchant(merchant)}


@router.get("/api/merchant/orders", dependencies=[Depends(require_merchant)])
def merchant_orders(session: Session = Depends(get_session)):
    orders = session.exec(
        select(Order).where(Order.order_status != "PENDING_PAYMENT").order_by(Order.id.desc())
    ).all()
    return [{**dump(order), **build_order_user_summary(session, order)} for order in orders]


@router.get("/api/merchant/orders/{order_id}", dependencies=[Depends(require_merchant)])
def merchant_order_detail(order_id: int, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    return {
        "order": {
            **dump(order),
            **build_order_user_summary(session, order),
        },
        "items": dump(items),
        "payment": dump(payment),
    }


@router.patch("/api/merchant/orders/{order_id}", dependencies=[Depends(require_merchant)])
def update_merchant_order(order_id: int, payload: MerchantOrderStatusUpdate, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.order_status not in {"DELIVERING", "COMPLETED"}:
        raise HTTPException(status_code=400, detail="Unsupported order status")
    if payload.order_status == "DELIVERING":
        if order.order_status != "PAID" or order.payment_status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Only paid orders can enter delivery")
    if payload.order_status == "COMPLETED":
        if order.order_status != "DELIVERING" or order.payment_status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Only delivering paid orders can be completed")
    order.order_status = payload.order_status
    if payload.order_status == "DELIVERING":
        order.delivering_at = datetime.utcnow()
        create_user_message(session, order.user_id, "开始配送", f"订单 {order.order_no} 已开始配送，请保持电话畅通。")
    if payload.order_status == "COMPLETED":
        order.completed_at = datetime.utcnow()
        create_user_message(session, order.user_id, "订单完成", f"订单 {order.order_no} 已完成，感谢你的下单。")
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/api/merchant/orders/{order_id}/confirm-payment", dependencies=[Depends(require_merchant)])
def confirm_merchant_payment(order_id: int, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "PROOF_UPLOADED":
        raise HTTPException(status_code=400, detail="Payment proof has not been submitted")
    mark_order_paid(session, order, payment)
    session.commit()
    session.refresh(order)
    session.refresh(payment)
    return {"order": dump(order), "payment": dump(payment)}


@router.post("/api/merchant/orders/{order_id}/reject-payment", dependencies=[Depends(require_merchant)])
def reject_merchant_payment(order_id: int, session: Session = Depends(get_session)):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    payment = session.exec(select(PaymentOrder).where(PaymentOrder.order_id == order_id)).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "PROOF_UPLOADED":
        raise HTTPException(status_code=400, detail="Payment proof is not awaiting review")
    payment.status = "FAILED"
    payment.reviewed_at = datetime.utcnow()
    order.payment_status = "FAILED"
    order.order_status = "PENDING_PAYMENT"
    session.add(payment)
    session.add(order)
    create_user_message(session, order.user_id, "付款截图未通过", f"订单 {order.order_no} 的付款截图未通过，请重新上传。")
    create_merchant_message(session, "已退回付款截图", f"订单 {order.order_no} 的付款截图已退回用户重新上传。")
    session.commit()
    session.refresh(order)
    session.refresh(payment)
    return {"order": dump(order), "payment": dump(payment)}


@router.get("/api/merchant/products", dependencies=[Depends(require_merchant)])
def merchant_products(session: Session = Depends(get_session)):
    return dump(session.exec(select(Product).order_by(Product.id.desc())).all())


@router.post("/api/merchant/products", dependencies=[Depends(require_merchant)])
def create_merchant_product(payload: ProductPayload, session: Session = Depends(get_session)):
    category = session.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category")
    product = Product(**payload.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return dump(product)


@router.get("/api/merchant/categories", dependencies=[Depends(require_merchant)])
def merchant_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category).order_by(Category.sort_order, Category.id)).all()


@router.post("/api/merchant/categories", dependencies=[Depends(require_merchant)])
def create_merchant_category(payload: CategoryPayload, session: Session = Depends(get_session)):
    category = Category(**payload.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return dump(category)


@router.patch("/api/merchant/categories/{category_id}", dependencies=[Depends(require_merchant)])
def update_merchant_category(category_id: int, payload: CategoryPayload, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in payload.model_dump().items():
        setattr(category, key, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return dump(category)


@router.delete("/api/merchant/categories/{category_id}", dependencies=[Depends(require_merchant)])
def delete_merchant_category(category_id: int, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    related = session.exec(select(Product).where(Product.category_id == category_id)).first()
    if related:
        raise HTTPException(status_code=400, detail="Category has related products")
    session.delete(category)
    session.commit()
    return {"message": "Category deleted"}


@router.patch("/api/merchant/products/{product_id}", dependencies=[Depends(require_merchant)])
def update_merchant_product(product_id: int, payload: ProductPayload, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    category = session.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    session.add(product)
    session.commit()
    session.refresh(product)
    return dump(product)


@router.get("/api/merchant/shop", dependencies=[Depends(require_merchant)])
def merchant_shop(session: Session = Depends(get_session)):
    shop = session.exec(select(Shop)).first()
    return dump(shop) if shop else None


@router.put("/api/merchant/shop", dependencies=[Depends(require_merchant)])
def update_merchant_shop(payload: ShopUpdatePayload, session: Session = Depends(get_session)):
    shop = session.exec(select(Shop)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    for key, value in payload.model_dump().items():
        setattr(shop, key, value)
    session.add(shop)
    session.commit()
    session.refresh(shop)
    return dump(shop)


@router.get("/api/merchant/messages", dependencies=[Depends(require_merchant)])
def merchant_messages(session: Session = Depends(get_session)):
    return session.exec(select(MerchantMessage).order_by(MerchantMessage.id.desc())).all()


@router.patch("/api/merchant/messages/{message_id}/read", dependencies=[Depends(require_merchant)])
def mark_merchant_message_read(message_id: int, session: Session = Depends(get_session)):
    message = session.get(MerchantMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.read = True
    session.add(message)
    session.commit()
    session.refresh(message)
    return dump(message)
