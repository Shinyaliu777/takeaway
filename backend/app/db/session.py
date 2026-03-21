import sqlite3

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import DATABASE_URL


engine_kwargs = {"echo": False, "pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite:///"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_legacy_columns()


def ensure_legacy_columns() -> None:
    if not DATABASE_URL.startswith("sqlite:///"):
        return
    db_path = DATABASE_URL.replace("sqlite:///", "", 1)
    connection = sqlite3.connect(db_path)
    try:
        user_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(user)")
        }
        shop_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(shop)")
        }
        product_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(product)")
        }
        order_item_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(orderitem)")
        }
        payment_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(paymentorder)")
        }
        if "avatar_url" not in user_columns:
            connection.execute("ALTER TABLE user ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
        if "mobile" not in user_columns:
            connection.execute("ALTER TABLE user ADD COLUMN mobile TEXT NOT NULL DEFAULT ''")
        if "wechat_qr_url" not in shop_columns:
            connection.execute("ALTER TABLE shop ADD COLUMN wechat_qr_url TEXT NOT NULL DEFAULT ''")
        if "alipay_qr_url" not in shop_columns:
            connection.execute("ALTER TABLE shop ADD COLUMN alipay_qr_url TEXT NOT NULL DEFAULT ''")
        if "tng_qr_url" not in shop_columns:
            connection.execute("ALTER TABLE shop ADD COLUMN tng_qr_url TEXT NOT NULL DEFAULT ''")
        if "description" not in product_columns:
            connection.execute("ALTER TABLE product ADD COLUMN description TEXT NOT NULL DEFAULT ''")
        if "option_groups_json" not in product_columns:
            connection.execute("ALTER TABLE product ADD COLUMN option_groups_json TEXT NOT NULL DEFAULT ''")
        if "selected_options_json" not in order_item_columns:
            connection.execute("ALTER TABLE orderitem ADD COLUMN selected_options_json TEXT NOT NULL DEFAULT ''")
        if "proof_image_url" not in payment_columns:
            connection.execute("ALTER TABLE paymentorder ADD COLUMN proof_image_url TEXT NOT NULL DEFAULT ''")
        if "reviewed_at" not in payment_columns:
            connection.execute("ALTER TABLE paymentorder ADD COLUMN reviewed_at TIMESTAMP")
        connection.commit()
    finally:
        connection.close()


def get_session():
    with Session(engine) as session:
        yield session
