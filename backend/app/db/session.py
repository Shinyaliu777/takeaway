import sqlite3

from sqlalchemy import inspect, text
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
    if DATABASE_URL.startswith("sqlite:///"):
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
            if "extra_rice_price" not in shop_columns:
                connection.execute("ALTER TABLE shop ADD COLUMN extra_rice_price REAL NOT NULL DEFAULT 2.0")
            if "featured_enabled" not in shop_columns:
                connection.execute("ALTER TABLE shop ADD COLUMN featured_enabled INTEGER NOT NULL DEFAULT 0")
            if "featured_cards_json" not in shop_columns:
                connection.execute("ALTER TABLE shop ADD COLUMN featured_cards_json TEXT NOT NULL DEFAULT '[]'")
            if "description" not in product_columns:
                connection.execute("ALTER TABLE product ADD COLUMN description TEXT NOT NULL DEFAULT ''")
            if "option_groups_json" not in product_columns:
                connection.execute("ALTER TABLE product ADD COLUMN option_groups_json TEXT NOT NULL DEFAULT ''")
            if "available_lunch" not in product_columns:
                connection.execute("ALTER TABLE product ADD COLUMN available_lunch INTEGER NOT NULL DEFAULT 1")
            if "available_dinner" not in product_columns:
                connection.execute("ALTER TABLE product ADD COLUMN available_dinner INTEGER NOT NULL DEFAULT 1")
            if "selected_options_json" not in order_item_columns:
                connection.execute("ALTER TABLE orderitem ADD COLUMN selected_options_json TEXT NOT NULL DEFAULT ''")
            if "proof_image_url" not in payment_columns:
                connection.execute("ALTER TABLE paymentorder ADD COLUMN proof_image_url TEXT NOT NULL DEFAULT ''")
            if "reviewed_at" not in payment_columns:
                connection.execute("ALTER TABLE paymentorder ADD COLUMN reviewed_at TIMESTAMP")
            connection.commit()
        finally:
            connection.close()
        return

    inspector = inspect(engine)
    existing_columns = {
        "user": {column["name"] for column in inspector.get_columns("user")},
        "shop": {column["name"] for column in inspector.get_columns("shop")},
        "product": {column["name"] for column in inspector.get_columns("product")},
        "orderitem": {column["name"] for column in inspector.get_columns("orderitem")},
        "paymentorder": {column["name"] for column in inspector.get_columns("paymentorder")},
    }
    alter_statements = []
    if "avatar_url" not in existing_columns["user"]:
        alter_statements.append("ALTER TABLE user ADD COLUMN avatar_url VARCHAR(255) NOT NULL DEFAULT ''")
    if "mobile" not in existing_columns["user"]:
        alter_statements.append("ALTER TABLE user ADD COLUMN mobile VARCHAR(255) NOT NULL DEFAULT ''")
    if "wechat_qr_url" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN wechat_qr_url VARCHAR(255) NOT NULL DEFAULT ''")
    if "alipay_qr_url" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN alipay_qr_url VARCHAR(255) NOT NULL DEFAULT ''")
    if "tng_qr_url" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN tng_qr_url VARCHAR(255) NOT NULL DEFAULT ''")
    if "extra_rice_price" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN extra_rice_price DOUBLE NOT NULL DEFAULT 2.0")
    if "featured_enabled" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN featured_enabled BOOLEAN NOT NULL DEFAULT FALSE")
    if "featured_cards_json" not in existing_columns["shop"]:
        alter_statements.append("ALTER TABLE shop ADD COLUMN featured_cards_json TEXT NOT NULL DEFAULT '[]'")
    if "description" not in existing_columns["product"]:
        alter_statements.append("ALTER TABLE product ADD COLUMN description TEXT NOT NULL")
    if "option_groups_json" not in existing_columns["product"]:
        alter_statements.append("ALTER TABLE product ADD COLUMN option_groups_json TEXT NOT NULL")
    if "available_lunch" not in existing_columns["product"]:
        alter_statements.append("ALTER TABLE product ADD COLUMN available_lunch BOOLEAN NOT NULL DEFAULT TRUE")
    if "available_dinner" not in existing_columns["product"]:
        alter_statements.append("ALTER TABLE product ADD COLUMN available_dinner BOOLEAN NOT NULL DEFAULT TRUE")
    if "selected_options_json" not in existing_columns["orderitem"]:
        alter_statements.append("ALTER TABLE orderitem ADD COLUMN selected_options_json TEXT NOT NULL")
    if "proof_image_url" not in existing_columns["paymentorder"]:
        alter_statements.append("ALTER TABLE paymentorder ADD COLUMN proof_image_url VARCHAR(255) NOT NULL DEFAULT ''")
    if "reviewed_at" not in existing_columns["paymentorder"]:
        alter_statements.append("ALTER TABLE paymentorder ADD COLUMN reviewed_at DATETIME NULL")

    if not alter_statements:
        return

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))


def get_session():
    with Session(engine) as session:
        yield session
