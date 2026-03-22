from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.entities import Order, OrderItem, PaymentOrder, Product


ALLOWED_MERCHANT_ORDER_STATUSES = {"DELIVERING", "COMPLETED"}


def _build_stock_deductions(session: Session, order_id: int) -> dict[int, int]:
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    stock_deductions: dict[int, int] = {}
    for item in items:
        selected_options = _parse_selected_options(item.selected_options_json)
        component_ids = [entry.get("product_id") for entry in selected_options if entry.get("product_id")]
        if component_ids:
            for product_id in component_ids:
                stock_deductions[product_id] = stock_deductions.get(product_id, 0) + 1
            continue
        if item.product_id > 0:
            stock_deductions[item.product_id] = stock_deductions.get(item.product_id, 0) + item.quantity
    return stock_deductions


def _parse_selected_options(raw_value: str) -> list[dict]:
    if not raw_value:
        return []
    try:
        import json

        parsed = json.loads(raw_value)
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def mark_order_paid(session: Session, order: Order, payment: PaymentOrder) -> None:
    if order.payment_status == "SUCCESS":
        return
    stock_deductions = _build_stock_deductions(session, order.id)
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


def reject_payment(session: Session, order: Order, payment: PaymentOrder) -> None:
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


def submit_payment_proof(session: Session, order: Order, payment: PaymentOrder, proof_image_url: str) -> None:
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


def transition_merchant_order(session: Session, order: Order, next_status: str) -> None:
    if next_status not in ALLOWED_MERCHANT_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported order status")
    if next_status == "DELIVERING":
        if order.order_status != "PAID" or order.payment_status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Only paid orders can enter delivery")
        order.delivering_at = datetime.utcnow()
        create_user_message(session, order.user_id, "开始配送", f"订单 {order.order_no} 已开始配送，请保持电话畅通。")
    elif next_status == "COMPLETED":
        if order.order_status != "DELIVERING" or order.payment_status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Only delivering paid orders can be completed")
        order.completed_at = datetime.utcnow()
        create_user_message(session, order.user_id, "订单完成", f"订单 {order.order_no} 已完成，感谢你的下单。")
    order.order_status = next_status
    session.add(order)


def create_user_message(session: Session, user_id: int, title: str, content: str) -> None:
    from app.models.entities import UserMessage

    session.add(UserMessage(user_id=user_id, title=title, content=content))


def create_merchant_message(session: Session, title: str, content: str) -> None:
    from app.models.entities import MerchantMessage

    session.add(MerchantMessage(title=title, content=content))
