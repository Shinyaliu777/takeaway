import os
import secrets
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
BUNDLED_UPLOAD_DIR = BASE_DIR / "uploads"
APP_DATA_DIR = Path(os.getenv("APP_DATA_DIR", str(BASE_DIR)))
DATA_DIR = APP_DATA_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = APP_DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'takeaway.db').as_posix()}")
DEFAULT_CURRENCY = "MYR"
USER_TOKEN_PREFIX = "user-"
MERCHANT_TOKEN_PREFIX = "merchant-"
WECHAT_APP_ID = os.getenv("WECHAT_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_APP_SECRET", "")
TOKEN_SIGNING_SECRET = os.getenv(
    "TOKEN_SIGNING_SECRET",
    WECHAT_APP_SECRET or "takeaway-dev-token-signing-secret",
)
IMAGE_UPLOAD_MAX_BYTES = int(os.getenv("IMAGE_UPLOAD_MAX_BYTES", str(5 * 1024 * 1024)))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000")
PORT = int(os.getenv("PORT", "8000"))
