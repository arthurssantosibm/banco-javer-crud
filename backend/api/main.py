from fastapi import FastAPI

app = FastAPI()

from auth_routes import auth_routes

app.include_router(auth_routes)