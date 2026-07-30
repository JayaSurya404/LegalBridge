"""SQLAlchemy column-type aliases used across models."""

from sqlalchemy import JSON as _JSON

# Re-export so models can import from app.db.types
JSON = _JSON
