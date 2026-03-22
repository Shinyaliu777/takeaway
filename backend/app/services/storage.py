from __future__ import annotations

from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.core.config import (
    COS_BUCKET,
    COS_DOMAIN,
    COS_PATH_PREFIX,
    COS_REGION,
    COS_SECRET_ID,
    COS_SECRET_KEY,
    COS_TOKEN,
    IMAGE_UPLOAD_MAX_BYTES,
    PUBLIC_BASE_URL,
    UPLOAD_DIR,
)


def _public_base_url(request_base_url: str) -> str:
    configured = (PUBLIC_BASE_URL or "").strip().rstrip("/")
    if configured:
        return configured
    return (request_base_url or "").strip().rstrip("/")


def _read_image_bytes(file: UploadFile) -> bytes:
    chunks = []
    written = 0
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        written += len(chunk)
        if written > IMAGE_UPLOAD_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large")
        chunks.append(chunk)
    return b"".join(chunks)


def _normalized_suffix(file: UploadFile) -> str:
    return (Path(file.filename or "image.jpg").suffix or ".jpg").lower()


def _build_cos_key(namespace: str, suffix: str) -> str:
    prefix = f"{COS_PATH_PREFIX}/" if COS_PATH_PREFIX else ""
    safe_namespace = namespace.strip().strip("/") or "uploads"
    return f"{prefix}{safe_namespace}/{uuid4().hex}{suffix}"


def _build_cos_public_url(key: str) -> str:
    if COS_DOMAIN:
        return f"{COS_DOMAIN}/{quote(key)}"
    return f"https://{COS_BUCKET}.cos.{COS_REGION}.myqcloud.com/{quote(key)}"


def cos_storage_enabled() -> bool:
    return all([COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET])


def _upload_to_cos(content: bytes, content_type: str, key: str) -> str:
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="COS SDK is not installed") from exc

    config = CosConfig(
        Region=COS_REGION,
        SecretId=COS_SECRET_ID,
        SecretKey=COS_SECRET_KEY,
        Token=COS_TOKEN or None,
        Scheme="https",
    )
    client = CosS3Client(config)
    client.put_object(
        Bucket=COS_BUCKET,
        Body=content,
        Key=key,
        ContentType=content_type or "application/octet-stream",
    )
    return _build_cos_public_url(key)


def _save_locally(content: bytes, suffix: str, request_base_url: str) -> str:
    filename = f"{uuid4().hex}{suffix}"
    target = UPLOAD_DIR / filename
    target.write_bytes(content)
    return f"{_public_base_url(request_base_url)}/uploads/{filename}"


def store_public_image(file: UploadFile, request_base_url: str, namespace: str) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image upload is supported")

    content = _read_image_bytes(file)
    suffix = _normalized_suffix(file)
    if cos_storage_enabled():
        key = _build_cos_key(namespace, suffix)
        return _upload_to_cos(content, file.content_type, key)
    return _save_locally(content, suffix, request_base_url)
