from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
# Silence noisy third-party loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.INFO)

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routers import projects, chat, dossi_board
import models  # noqa: F401 — ensures models are registered with Base

UPLOAD_ROOT = Path(__file__).parent / "uploads" / "dossi_board"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Dossier API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables on startup (Alembic takes over for future migrations)
Base.metadata.create_all(bind=engine)

app.include_router(projects.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(dossi_board.router, prefix="/api")

# Serve uploaded dossi board files as static assets
app.mount("/uploads/dossi_board", StaticFiles(directory=str(UPLOAD_ROOT)), name="dossi_board_uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
