"""Top-level versioned API router."""

from fastapi import APIRouter

from app.api.routes.health import router as system_router

api_router = APIRouter()
api_router.include_router(system_router)
