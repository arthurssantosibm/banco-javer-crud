from dotenv import load_dotenv
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from api.auth_routes import auth_router
from api.auth_routes import user_router
from api.auth_routes import transacoes_router
from api.auth_routes import deposit_router
from api.auth_routes import saque_router

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500", 
    "http://127.0.0.1:8000", 
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(transacoes_router)
app.include_router(deposit_router)
app.include_router(saque_router)
