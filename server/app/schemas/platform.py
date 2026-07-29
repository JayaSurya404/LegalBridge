"""Request contracts for analysis, motions, reviews, and Legal Copilot."""

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field


class AnalysisRunCreate(BaseModel):
    provider: Literal["deterministic", "future_ai"] | None = None


class ContradictionUpdate(BaseModel):
    status: Literal["detected", "reviewed", "accepted", "dismissed"]
    reviewer_note: str | None = Field(default=None, max_length=4000)


class MotionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    motion_type: str = Field(default="source-grounded_demonstration_motion", max_length=100)


class MotionVersionCreate(BaseModel):
    content_json: dict[str, str] | None = None
    rendered_text: str | None = Field(default=None, max_length=200_000)


class MotionReviewCreate(BaseModel):
    decision: Literal["changes_requested", "approved", "rejected"]
    comments: str = Field(min_length=1, max_length=10_000)
    review_pin: str = Field(
        min_length=4,
        max_length=20,
        validation_alias=AliasChoices("review_pin", "pin"),
    )


class CopilotThreadCreate(BaseModel):
    title: str = Field(default="Case source review", min_length=1, max_length=250)


class CopilotMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10_000)
