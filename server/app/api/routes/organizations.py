"""Current-organisation route."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import Principal, get_current_principal
from app.models.organization import Organization
from app.schemas.organization import OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/current", response_model=OrganizationResponse)
async def current_organization(
    principal: Annotated[Principal, Depends(get_current_principal)],
) -> Organization:
    return principal.organization
