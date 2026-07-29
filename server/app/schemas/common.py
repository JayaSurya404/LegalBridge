"""Common API response schemas."""

from pydantic import BaseModel


class RootServiceResponse(BaseModel):
    service: str
    version: str
    environment: str
    api_prefix: str
    documentation_url: str | None
    legal_disclaimer: str


class ErrorItem(BaseModel):
    location: str
    message: str
    type: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str
    details: list[ErrorItem] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
