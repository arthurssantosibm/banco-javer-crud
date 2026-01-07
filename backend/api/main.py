from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from api.auth_routes import auth_router

app = FastAPI()
app.include_router(auth_router)
