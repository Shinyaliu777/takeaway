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
    IMAGE_STORAGE_BACKEND,
    IMAGE_STORAGE_LOCAL_PUBLIC_PATH,
    IMAGE_STORAGE_STATIC_PUBLIC_BASE_URL,
    IMAGE_STORAGE_STATIC_PUBLIC_PATH,
    COS_SECRET_ID,
    COS_SECRET_KEY,
    COS_TOKEN,
    IMAGE_UPLOAD_MAX_BYTES,
    PUBLIC_BASE_URL,
    UPLOAD_DIR,
)


def _normalize_backend_name(raw_backend: str | None) -> str:
    backend = (raw_backend or "auto").strip().lower()
    if backend in {"auto", "local", "static", "cos"}:
        return backend
    return "auto"


def _selected_backend() -> str:
    backend = _normalize_backend_name(IMAGE_STORAGE_BACKEND)
    if backend == "auto":
        # Auto mode keeps the current production behavior: prefer COS when it is fully configured,
        # otherwise fall back to the local runtime uploads directory.
        return "cos" if cos_storage_enabled() else "local"
    return backend


def _public_base_url(request_base_url: str) -> str:
    configured = (PUBLIC_BASE_URL or "").strip().rstrip("/")
    if configured:
        return configured
    return (request_base_url or "").strip().rstrip("/")


def _join_public_url(base_url: str, *segments: str) -> str:
    base = (base_url or "").strip().rstrip("/")
    clean_segments = [segment.strip("/") for segment in segments if segment and segment.strip("/")]
    if not clean_segments:
        return base
    if base:
        return f"{base}/{'/'.join(clean_segments)}"
    return "/" + "/".join(clean_segments)


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


def _save_locally(content: bytes, suffix: str) -> str:
    filename = f"{uuid4().hex}{suffix}"
    target = UPLOAD_DIR / filename
    target.write_bytes(content)
    return filename


def _store_local_upload(content: bytes, suffix: str, request_base_url: str) -> str:
    filename = _save_locally(content, suffix)
    return _join_public_url(_public_base_url(request_base_url), IMAGE_STORAGE_LOCAL_PUBLIC_PATH, filename)


def _require_static_storage_configured() -> None:
    if not IMAGE_STORAGE_STATIC_PUBLIC_BASE_URL:
        raise HTTPException(
            status_code=500,
            detail=(
                "Static image storage is not configured; set IMAGE_STORAGE_STATIC_PUBLIC_BASE_URL "
                "or switch IMAGE_STORAGE_BACKEND to local/cos"
            ),
        )


def _store_static_upload(content: bytes, suffix: str) -> str:
    _require_static_storage_configured()
    filename = _save_locally(content, suffix)
    return _join_public_url(IMAGE_STORAGE_STATIC_PUBLIC_BASE_URL, IMAGE_STORAGE_STATIC_PUBLIC_PATH, filename)


def _store_cos_upload(content: bytes, content_type: str, suffix: str, namespace: str) -> str:
    key = _build_cos_key(namespace, suffix)
    return _upload_to_cos(content, content_type, key)


def store_public_image(file: UploadFile, request_base_url: str, namespace: str) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image upload is supported")

    content = _read_image_bytes(file)
    suffix = _normalized_suffix(file)
    backend = _selected_backend()

    if backend == "cos":
        if not cos_storage_enabled():
            raise HTTPException(
                status_code=500,
                detail=(
                    "COS storage is not configured; set COS_SECRET_ID, COS_SECRET_KEY, "
                    "COS_REGION and COS_BUCKET, or switch IMAGE_STORAGE_BACKEND to local/static"
                ),
            )
        return _store_cos_upload(content, file.content_type, suffix, namespace)
    if backend == "static":
        return _store_static_upload(content, suffix)
    return _store_local_upload(content, suffix, request_base_url)
