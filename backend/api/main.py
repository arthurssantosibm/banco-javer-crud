from fastapi import FastAPI
from api.auth_routes import auth_router

app = FastAPI()
app.include_router(auth_router)