"""Organisation response schemas."""

from datetime import datetime

from app.schemas.base import ORMResponse


class OrganizationResponse(ORMResponse):
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
