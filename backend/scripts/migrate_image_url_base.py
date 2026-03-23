#!/usr/bin/env python3

import argparse
import os
from dataclasses import dataclass
from pathlib import Path
import sys

from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import DATABASE_URL as DEFAULT_DATABASE_URL


@dataclass(frozen=True)
class FieldTarget:
    table: str
    pk: str
    column: str


FIELD_TARGETS = [
    FieldTarget("shop", "id", "logo_url"),
    FieldTarget("shop", "id", "wechat_qr_url"),
    FieldTarget("shop", "id", "alipay_qr_url"),
    FieldTarget("shop", "id", "tng_qr_url"),
    FieldTarget("shop", "id", "featured_cards_json"),
    FieldTarget("product", "id", "image_url"),
    FieldTarget("paymentorder", "id", "qr_code_url"),
    FieldTarget("paymentorder", "id", "proof_image_url"),
    FieldTarget("user", "id", "avatar_url"),
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scan and optionally replace image URL base values in the takeaway database."
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL,
        help="Database URL. Defaults to DATABASE_URL env var, then app.core.config.DATABASE_URL.",
    )
    parser.add_argument("--old-base", required=True, help="Old URL base to match, e.g. https://old.example.com")
    parser.add_argument("--new-base", help="New URL base to replace with when --apply is set.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Execute updates. Without this flag the script only prints matching records.",
    )
    return parser


def normalize_base(value: str) -> str:
    return value.strip().rstrip("/")


def build_engine(database_url: str):
    if not database_url:
        raise SystemExit("DATABASE_URL is required. Pass --database-url or set DATABASE_URL.")
    return create_engine(database_url, pool_pre_ping=True)


def find_matches(conn, target: FieldTarget, old_base: str):
    query = text(
        f"""
        SELECT {target.pk} AS record_id, {target.column} AS column_value
        FROM {target.table}
        WHERE {target.column} IS NOT NULL
          AND {target.column} <> ''
          AND {target.column} LIKE :pattern
        ORDER BY {target.pk}
        """
    )
    return conn.execute(query, {"pattern": f"%{old_base}%"}).mappings().all()


def replace_matches(conn, target: FieldTarget, old_base: str, new_base: str) -> int:
    query = text(
        f"""
        UPDATE {target.table}
        SET {target.column} = REPLACE({target.column}, :old_base, :new_base)
        WHERE {target.column} IS NOT NULL
          AND {target.column} <> ''
          AND {target.column} LIKE :pattern
        """
    )
    result = conn.execute(
        query,
        {
            "old_base": old_base,
            "new_base": new_base,
            "pattern": f"%{old_base}%",
        },
    )
    return result.rowcount or 0


def preview_value(value: str, old_base: str, new_base: str | None = None) -> str:
    preview = value
    if new_base:
        preview = preview.replace(old_base, new_base, 1)
    if len(preview) > 180:
        return f"{preview[:177]}..."
    return preview


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    old_base = normalize_base(args.old_base)
    new_base = normalize_base(args.new_base) if args.new_base else None

    if args.apply and not new_base:
        raise SystemExit("--new-base is required when --apply is set.")

    engine = build_engine(args.database_url)

    total_matches = 0
    total_updates = 0
    printed_header = False

    with engine.begin() as conn:
        for target in FIELD_TARGETS:
            matches = find_matches(conn, target, old_base)
            if not matches:
                continue

            if not printed_header:
                print(f"database_url={args.database_url}")
                print(f"old_base={old_base}")
                if new_base:
                    print(f"new_base={new_base}")
                print("")
                printed_header = True

            print(f"[{target.table}.{target.column}] matches={len(matches)}")
            for match in matches:
                total_matches += 1
                record_id = match["record_id"]
                column_value = match["column_value"] or ""
                print(
                    f"  - id={record_id} current={preview_value(column_value, old_base)}"
                )
                if new_base:
                    print(
                        f"    -> new={preview_value(column_value, old_base, new_base)}"
                    )

            if args.apply:
                updated = replace_matches(conn, target, old_base, new_base)
                total_updates += updated
                print(f"  updated_rows={updated}")

            print("")

    if not printed_header:
        print("No matching records found.")
        return

    print(f"total_matches={total_matches}")
    if args.apply:
        print(f"total_updated={total_updates}")
    else:
        print("dry_run=true")


if __name__ == "__main__":
    main()
