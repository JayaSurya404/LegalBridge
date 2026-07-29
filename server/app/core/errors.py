"""Structured and non-leaking API error responses."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

LOGGER = logging.getLogger("legalbridge.errors")


class ApplicationError(Exception):
    """Expected application failure safe to return to an API caller."""

    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


def _error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: list[dict[str, str]] | None = None,
) -> JSONResponse:
    error: dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if details:
        error["details"] = details
    return JSONResponse(status_code=status_code, content={"error": error})


def unexpected_error_response(request: Request) -> JSONResponse:
    return _error_response(
        request,
        status_code=500,
        code="internal_error",
        message="An unexpected server error occurred.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApplicationError)
    async def handle_application_error(
        request: Request,
        exc: ApplicationError,
    ) -> JSONResponse:
        return _error_response(
            request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        details = [
            {
                "location": ".".join(str(part) for part in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return _error_response(
            request,
            status_code=422,
            code="validation_error",
            message="The request did not pass validation.",
            details=details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        message = (
            exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
        )
        return _error_response(
            request,
            status_code=exc.status_code,
            code="not_found" if exc.status_code == 404 else "http_error",
            message=message,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        LOGGER.exception(
            "unhandled_application_error request_id=%s",
            _request_id(request),
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return unexpected_error_response(request)
