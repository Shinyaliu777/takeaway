from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nickname: str
    avatar_url: str = ""
    mobile: str = ""
    wechat_openid: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MerchantUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password: str
    display_name: str


class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    logo_url: str = ""
    wechat_qr_url: str = ""
    alipay_qr_url: str = ""
    tng_qr_url: str = ""
    phone: str
    address: str
    notice: str = ""
    business_hours: str = "10:00-22:00"
    currency_code: str = "MYR"
    extra_rice_price: float = 2.0
    featured_enabled: bool = False
    featured_cards_json: str = "[]"


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    sort_order: int = 0
    status: bool = True


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category_id: int = Field(index=True)
    name: str
    image_url: str = ""
    description: str = ""
    option_groups_json: str = ""
    price_amount: float
    stock_qty: int = 0
    sale_status: bool = True
    available_lunch: bool = True
    available_dinner: bool = True


class ComboRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    meat_count: int = 0
    veg_count: int = 0
    price: float
    sort_order: int = 0
    enabled: bool = True


class UserAddress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    receiver_name: str
    receiver_mobile: str
    detail_address: str
    is_default: bool = False


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_no: str = Field(index=True, unique=True)
    user_id: int = Field(index=True)
    receiver_name: str
    receiver_mobile: str
    receiver_address: str
    total_amount: float
    currency_code: str = "MYR"
    order_status: str = "PENDING_PAYMENT"
    payment_status: str = "UNPAID"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    delivering_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(index=True)
    product_id: int
    product_name_snapshot: str
    product_price_snapshot: float
    selected_options_json: str = ""
    quantity: int
    line_amount: float


class PaymentOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(index=True)
    payment_no: str = Field(index=True, unique=True)
    channel_code: str
    amount: float
    currency_code: str = "MYR"
    status: str = "UNPAID"
    qr_code_url: str = ""
    proof_image_url: str = ""
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None


class MerchantMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    title: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
