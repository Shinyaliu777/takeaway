from typing import Annotated, List, Optional

from pydantic import BaseModel, Field


class UserLoginPayload(BaseModel):
    code: str = Field(min_length=1)
    nickname: str = Field(default="微信用户", min_length=1)
    avatar_url: Optional[str] = ""
    phone_code: Optional[str] = ""
    encrypted_data: Optional[str] = ""
    iv: Optional[str] = ""


class GuestLoginPayload(BaseModel):
    nickname: str = Field(default="体验用户", min_length=1)
    avatar_url: Optional[str] = ""


class AddressCreate(BaseModel):
    receiver_name: str = Field(min_length=1)
    receiver_mobile: str = Field(min_length=1)
    detail_address: str = Field(min_length=1)
    is_default: bool = False


class CartItemPayload(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    user_id: int = 1
    receiver_name: str = Field(min_length=1)
    receiver_mobile: str = Field(min_length=1)
    receiver_address: str = Field(min_length=1)
    channel_code: str = Field(min_length=1)
    items: Annotated[List[CartItemPayload], Field(min_length=1)]


class MerchantLoginPayload(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class MerchantOrderStatusUpdate(BaseModel):
    order_status: str = Field(min_length=1)


class ProductPayload(BaseModel):
    category_id: int
    name: str = Field(min_length=1)
    image_url: Optional[str] = ""
    description: Optional[str] = ""
    price_amount: float = Field(gt=0)
    stock_qty: int = Field(ge=0)
    sale_status: bool = True


class CategoryPayload(BaseModel):
    name: str = Field(min_length=1)
    sort_order: int = Field(default=0, ge=0)
    status: bool = True


class ShopUpdatePayload(BaseModel):
    name: str = Field(min_length=1)
    logo_url: str = ""
    wechat_qr_url: str = ""
    alipay_qr_url: str = ""
    tng_qr_url: str = ""
    phone: str = Field(min_length=1)
    address: str = Field(min_length=1)
    notice: str = ""
    business_hours: str = Field(min_length=1)
