"""Shared schema configuration."""

from pydantic import BaseModel, ConfigDict


class ORMResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
