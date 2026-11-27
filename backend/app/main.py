from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.health_routes import router as health_router
from app.job_order_routes import router as job_orders_router

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Only needed when the browser calls this API from a different origin than the
# one serving the frontend. The API is read-only and sends no cookies.
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET"],
        allow_headers=["Accept"],
        allow_credentials=False,
    )

app.include_router(health_router)
app.include_router(job_orders_router)