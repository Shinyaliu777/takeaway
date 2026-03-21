import shutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from app.api.routes import router
from app.core.config import BUNDLED_UPLOAD_DIR, UPLOAD_DIR
from app.db.session import engine, init_db
from app.services.bootstrap import seed_data


app = FastAPI(title="Takeaway MVP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup():
    if BUNDLED_UPLOAD_DIR.exists():
        for asset in BUNDLED_UPLOAD_DIR.iterdir():
            if not asset.is_file():
                continue
            target = UPLOAD_DIR / asset.name
            if not target.exists():
                shutil.copy2(asset, target)
    init_db()
    with Session(engine) as session:
        seed_data(session)
