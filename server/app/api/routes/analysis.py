"""Authenticated organisation-scoped analysis and result routes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal, require_roles
from app.api.routes.cases import get_organization_case
from app.core.config import Settings, get_settings
from app.core.errors import ApplicationError
from app.db.session import get_session
from app.models.analysis import (
    AgentRun,
    AnalysisRun,
    CaseFact,
    ContradictionRecord,
    EthicsFinding,
    LegalAuthority,
    ProceduralFinding,
    StrategyRecommendation,
    TimelineEventRecord,
)
from app.models.enums import UserRole
from app.schemas.platform import AnalysisRunCreate, ContradictionUpdate
from app.services.analysis import run_case_analysis
from app.services.audit import add_audit_event
from app.services.platform import (
    analysis_summary,
    latest_analysis_run,
    list_for_run,
    serialize_model,
)

router = APIRouter(tags=["analysis"])
analysis_runner = require_roles(UserRole.ADMIN, UserRole.ATTORNEY)


async def _latest_results(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
    model: type[Any],
    order_by: Any,
) -> list[dict[str, Any]]:
    await get_organization_case(
        session, organization_id=organization_id, case_id=case_id
    )
    run = await latest_analysis_run(
        session, organization_id=organization_id, case_id=case_id
    )
    if run is None:
        return []
    return [
        serialize_model(item)
        for item in await list_for_run(session, model, run.id, order_by=order_by)
    ]


@router.post("/cases/{case_id}/analysis-runs")
async def create_analysis_run(
    case_id: str,
    payload: AnalysisRunCreate,
    principal: Annotated[Principal, Depends(analysis_runner)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    provider = payload.provider or settings.analysis_provider
    if provider != "deterministic":
        raise ApplicationError(
            status_code=422,
            code="provider_unavailable",
            message="Only the deterministic analysis provider is available.",
        )
    try:
        run = await run_case_analysis(
            session,
            organization_id=principal.organization.id,
            case_id=case_id,
            user_id=principal.user.id,
            provider_name=provider,
        )
    except ValueError as exc:
        raise ApplicationError(
            status_code=404, code="case_not_found", message=str(exc)
        ) from exc
    return serialize_model(run)


@router.get("/cases/{case_id}/analysis-runs")
async def list_analysis_runs(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    await get_organization_case(
        session, organization_id=principal.organization.id, case_id=case_id
    )
    runs = (
        await session.scalars(
            select(AnalysisRun)
            .where(
                AnalysisRun.organization_id == principal.organization.id,
                AnalysisRun.case_id == case_id,
            )
            .order_by(AnalysisRun.created_at.desc())
        )
    ).all()
    return [serialize_model(run) for run in runs]


@router.get("/cases/{case_id}/analysis-runs/{run_id}")
async def get_analysis_run(
    case_id: str,
    run_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    run = (
        await session.scalars(
            select(AnalysisRun).where(
                AnalysisRun.id == run_id,
                AnalysisRun.organization_id == principal.organization.id,
                AnalysisRun.case_id == case_id,
            )
        )
    ).one_or_none()
    if run is None:
        raise ApplicationError(
            status_code=404,
            code="analysis_run_not_found",
            message="Analysis run not found.",
        )
    agents = await list_for_run(
        session, AgentRun, run.id, order_by=AgentRun.sequence_number
    )
    return {
        **serialize_model(run),
        "agents": [serialize_model(agent) for agent in agents],
    }


@router.get("/cases/{case_id}/analysis-summary")
async def get_analysis_summary(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    await get_organization_case(
        session, organization_id=principal.organization.id, case_id=case_id
    )
    return await analysis_summary(
        session, organization_id=principal.organization.id, case_id=case_id
    )


@router.get("/cases/{case_id}/facts")
async def list_facts(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=CaseFact,
        order_by=CaseFact.created_at,
    )


@router.get("/cases/{case_id}/timeline")
async def list_timeline(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=TimelineEventRecord,
        order_by=TimelineEventRecord.sequence_number,
    )


@router.get("/cases/{case_id}/contradictions")
async def list_contradictions(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=ContradictionRecord,
        order_by=ContradictionRecord.created_at,
    )


@router.patch("/cases/{case_id}/contradictions/{contradiction_id}")
async def update_contradiction(
    case_id: str,
    contradiction_id: str,
    payload: ContradictionUpdate,
    principal: Annotated[
        Principal,
        Depends(
            require_roles(UserRole.ADMIN, UserRole.ATTORNEY, UserRole.REVIEWER)
        ),
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    contradiction = (
        await session.scalars(
            select(ContradictionRecord).where(
                ContradictionRecord.id == contradiction_id,
                ContradictionRecord.organization_id == principal.organization.id,
                ContradictionRecord.case_id == case_id,
            )
        )
    ).one_or_none()
    if contradiction is None:
        raise ApplicationError(
            status_code=404,
            code="contradiction_not_found",
            message="Contradiction not found.",
        )
    contradiction.status = payload.status
    contradiction.reviewer_note = payload.reviewer_note
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="contradiction_review",
        message="Contradiction review status updated.",
        entity_type="contradiction",
        entity_id=contradiction.id,
        case_id=case_id,
        metadata={"status": payload.status},
    )
    await session.commit()
    return serialize_model(contradiction)


@router.get("/cases/{case_id}/procedural-findings")
async def list_procedural_findings(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=ProceduralFinding,
        order_by=ProceduralFinding.created_at,
    )


@router.get("/cases/{case_id}/research")
async def list_research(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    summary = await get_analysis_summary(case_id, principal, session)
    return summary["research"]


@router.get("/cases/{case_id}/strategies")
async def list_strategies(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=StrategyRecommendation,
        order_by=StrategyRecommendation.created_at,
    )


@router.get("/cases/{case_id}/ethics-findings")
async def list_ethics_findings(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    return await _latest_results(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        model=EthicsFinding,
        order_by=EthicsFinding.created_at,
    )


@router.get("/legal-authorities")
async def list_authorities(
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict[str, Any]]:
    authorities = (
        await session.scalars(
            select(LegalAuthority)
            .where(
                (LegalAuthority.organization_id == principal.organization.id)
                | (LegalAuthority.organization_id.is_(None))
            )
            .order_by(LegalAuthority.citation)
        )
    ).all()
    return [serialize_model(item) for item in authorities]


@router.get("/legal-authorities/{authority_id}")
async def get_authority(
    authority_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    authority = (
        await session.scalars(
            select(LegalAuthority).where(
                LegalAuthority.id == authority_id,
                (LegalAuthority.organization_id == principal.organization.id)
                | (LegalAuthority.organization_id.is_(None)),
            )
        )
    ).one_or_none()
    if authority is None:
        raise ApplicationError(
            status_code=404,
            code="authority_not_found",
            message="Authority not found.",
        )
    return serialize_model(authority)
