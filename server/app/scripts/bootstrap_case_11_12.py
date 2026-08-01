"""Prepare the two small, idempotent casework presentation cases.

Case 11 is a completed continuity-review reference.  Case 12 is intentionally
created without documents so its ten files can be uploaded through the live UI.
"""

# ruff: noqa: E501

from __future__ import annotations

import asyncio
import tempfile
from dataclasses import replace
from pathlib import Path

from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.db.session import Database
from app.models.analysis import AnalysisRun
from app.models.case import LegalCase
from app.models.enums import CaseStatus
from app.scripts.bootstrap_casework_workspace import (
    PROFILES,
    REPOSITORY_ROOT,
    _ingest_source,
    _organization_and_users,
    _source,
    _write_docx,
    _write_pdf,
    _write_source,
    _write_txt,
)
from app.services.analysis import run_case_analysis
from app.services.audit import add_audit_event
from app.services.storage import create_storage_service

CASE_11_NUMBER = "LB-CASE-2026-011"
CASE_12_NUMBER = "LB-CASE-2026-012"
CASE_12_TITLE = "Search Authorisation, CCTV Continuity and Witness Identification Review"


def _case_12_pages(title: str, records: list[tuple[str, str, str]]) -> list[str]:
    lines = "\n".join(f"RECORD: {key} | {value} | {detail}" for key, value, detail in records)
    return [
        f"{title}\nCase number: {CASE_12_NUMBER}\nDocument date: 24 February 2026\n\n"
        f"{lines}\n\nFictional training dataset. Attorney review required; not legal advice."
    ]


def create_case_12_pack(root: Path) -> Path:
    destination = root / "case-packs" / CASE_12_NUMBER
    destination.mkdir(parents=True, exist_ok=True)
    sources = (
        ("01_case_intake.pdf", "Case Intake", [("witness_event_time", "18:05", "Priya Shah places the observed event at East Loading Yard."), ("location", "East Loading Yard", "Initial intake location."), ("clothing", "Black jacket", "Initial witness description."), ("bag_description", "Grey laptop bag", "Initial witness description.")]),
        ("02_witness_priya_shah.docx", "Priya Shah Witness Statement", [("witness_event_time", "18:05", "Priya Shah observed the event at East Loading Yard."), ("location", "East Loading Yard", "Priya Shah location description."), ("clothing", "Black jacket", "Priya Shah description."), ("bag_description", "Grey laptop bag", "Priya Shah description.")]),
        ("03_witness_imran_ali.docx", "Imran Ali Witness Statement", [("witness_event_time", "18:35", "Imran Ali records a later event time."), ("location", "North Service Corridor", "Imran Ali location description."), ("clothing", "Blue shirt", "Imran Ali description."), ("bag_description", "Black backpack", "Imran Ali description.")]),
        ("04_station_diary.txt", "Station Diary", [("officers_departure_time", "18:10", "Officers leave the station."), ("officer_arrival_time", "18:32", "Officers arrive at the recorded location."), ("search_start_time", "18:25", "Search commencement recorded before arrival.")]),
        ("05_search_memo.pdf", "Search Memo", [("search_start_time", "18:25", "Search start entered in the search memo."), ("authorisation_time", "18:40", "Search authorisation signed after recorded start."), ("laptop_sealed_time", "18:48", "Laptop sealed with seal AX-44018."), ("seal_code", "AX-44018", "Search memo seal code.")]),
        ("06_property_register.docx", "Property Register", [("property_register_time", "19:20", "Property register entry time."), ("seal_code", "AX-44081", "Receiving register seal code."), ("device_id", "LB-LAPTOP-12", "Laptop identifier.")]),
        ("07_cctv_export_log.txt", "CCTV Export Log", [("cctv_export_time", "20:12", "CCTV export completed."), ("checksum", "7A4C-11D2", "Export log checksum."), ("software_version", "missing", "Export software version is not recorded."), ("clock_synchronisation", "missing", "Clock synchronisation status is not recorded.")]),
        ("08_cctv_certificate.pdf", "CCTV Evidence Certificate", [("certificate_export_time", "20:34", "Certificate records a later export time."), ("checksum", "7A9C-11D2", "Certificate checksum."), ("certificate_signing_time", "missing", "Certificate signing time is not recorded.")]),
        ("09_identification_note.docx", "Identification Note", [("single_photo_identification_time", "21:10", "Witness was shown a single photograph."), ("formal_photo_array_time", "22:00", "Formal photo array later recorded.")]),
        ("10_case_closure_checklist.txt", "Case Source Checklist", [("person", "Priya Shah", "Witness source present."), ("person", "Imran Ali", "Witness source present."), ("electronic_certificate", "incomplete", "Certificate requires attorney verification.")]),
    )
    for filename, title, records in sources:
        path = destination / filename
        pages = _case_12_pages(title, records)
        if path.suffix == ".pdf":
            _write_pdf(path, title, pages)
        elif path.suffix == ".docx":
            _write_docx(path, title, pages)
        else:
            _write_txt(path, pages)
    (destination / "UPLOAD_INSTRUCTIONS.md").write_text(
        "Upload all ten files to LB-CASE-2026-012, wait for Processed, then run Analysis.\n",
        encoding="utf-8",
    )
    return destination


async def _ensure_case(session, organization_id: str, number: str, title: str, status: CaseStatus, user_id: str, attorney_id: str) -> LegalCase:
    case = await session.scalar(select(LegalCase).where(LegalCase.organization_id == organization_id, LegalCase.case_number == number))
    if case is None:
        case = LegalCase(organization_id=organization_id, case_number=number, title=title, description="Fictional training dataset for source-grounded attorney review.", court_name="Harbour District Review Forum", jurisdiction="Fictional Indian district jurisdiction", allegation_type="Electronic evidence continuity", status=status, created_by_id=user_id, assigned_attorney_id=attorney_id)
        session.add(case)
        await session.flush()
        add_audit_event(session, organization_id=organization_id, actor_user_id=user_id, event_type="case_created", message=f"{number} created for controlled casework presentation.", entity_type="case", entity_id=case.id, case_id=case.id)
        await session.commit()
    return case


async def bootstrap_case_11_12(database: Database, settings: Settings) -> None:
    async with database.session_factory() as session:
        organization, users = await _organization_and_users(session)
        admin, attorney = users["admin@legalbridge.in"], users["attorney@legalbridge.in"]
        case11 = await _ensure_case(session, organization.id, CASE_11_NUMBER, "Electronic Evidence Continuity Review", CaseStatus.CLOSED, admin.id, attorney.id)
        await _ensure_case(session, organization.id, CASE_12_NUMBER, CASE_12_TITLE, CaseStatus.DRAFT, admin.id, attorney.id)
        storage = create_storage_service(settings)
        storage.ensure_ready()
        if not await session.scalar(select(AnalysisRun.id).where(AnalysisRun.case_id == case11.id, AnalysisRun.status == "completed")):
            profile = replace(PROFILES[3], number=CASE_11_NUMBER, title="Electronic Evidence Continuity Review")
            with tempfile.TemporaryDirectory(prefix="legalbridge-case-11-") as directory:
                for index in range(8):
                    source = _source(profile, index)
                    path = Path(directory) / source.filename
                    _write_source(path, source, profile, index)
                    await _ingest_source(session, source=source, source_path=path, organization=organization, legal_case=case11, primary=admin, settings=settings, storage=storage)
            await run_case_analysis(session, organization_id=organization.id, case_id=case11.id, user_id=admin.id, provider_name=settings.analysis_provider)
        print(f"case_11_id: {case11.id}")
        print(f"case_12_pack: {create_case_12_pack(REPOSITORY_ROOT)}")


async def main() -> None:
    settings = get_settings()
    database = Database(settings.database_url, echo=settings.sql_echo, ssl_mode=settings.database_ssl, pool_size=settings.database_pool_size, max_overflow=settings.database_max_overflow, pool_timeout=settings.database_pool_timeout, pool_recycle=settings.database_pool_recycle)
    try:
        await bootstrap_case_11_12(database, settings)
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main())
