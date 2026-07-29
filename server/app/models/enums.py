"""Persistent domain enumerations."""

from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    ATTORNEY = "attorney"
    REVIEWER = "reviewer"


class CaseStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    REVIEW = "review"
    CLOSED = "closed"
    ARCHIVED = "archived"
