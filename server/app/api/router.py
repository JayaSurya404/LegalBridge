"""Top-level versioned API router."""

from fastapi import APIRouter

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.cases import router as cases_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as system_router
from app.api.routes.organizations import router as organizations_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(organizations_router)
api_router.include_router(users_router)
api_router.include_router(cases_router)
api_router.include_router(documents_router)
api_router.include_router(audit_router)
