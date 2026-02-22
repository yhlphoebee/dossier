from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import projects, chat
import models  # noqa: F401 — ensures models are registered with Base

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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
