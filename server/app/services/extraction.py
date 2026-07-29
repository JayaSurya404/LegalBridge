"""Format-specific source-text extraction without legal analysis."""

from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Literal

import docx
import pymupdf
import pytesseract
from charset_normalizer import from_bytes
from docx.document import Document as DocumentType
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph
from PIL import Image

from app.core.config import Settings

ExtractionStatus = Literal[
    "processed",
    "partially_processed",
    "ocr_required",
    "failed",
]


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    page_label: str
    extracted_text: str
    extraction_method: str

    @property
    def character_count(self) -> int:
        return len(self.extracted_text)


@dataclass(frozen=True)
class ExtractionResult:
    parser_name: str
    parser_version: str
    status: ExtractionStatus
    pages: tuple[ExtractedPage, ...]
    character_count: int
    warnings: tuple[str, ...] = ()
    ocr_required: bool = False
    error: str | None = None


def _normalise_text(value: str, *, preserve_form_feed: bool = False) -> str:
    normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    allowed_controls = {"\n", "\t"}
    if preserve_form_feed:
        allowed_controls.add("\f")
    normalized = "".join(
        character
        for character in normalized
        if character in allowed_controls or (ord(character) >= 32 and ord(character) != 127)
    )
    lines = [re.sub(r"[ \t]+$", "", line) for line in normalized.split("\n")]
    return "\n".join(lines).strip()


def _meaningful(value: str) -> bool:
    return len(re.findall(r"\w", value, flags=re.UNICODE)) >= 20


def _apply_limits(
    pages: list[ExtractedPage],
    settings: Settings,
) -> tuple[tuple[ExtractedPage, ...], int, tuple[str, ...], bool]:
    limited: list[ExtractedPage] = []
    total = 0
    warnings: list[str] = []
    truncated = False
    for page in pages[: settings.extraction_max_pages]:
        text = page.extracted_text
        if len(text) > settings.extraction_page_text_limit:
            text = text[: settings.extraction_page_text_limit]
            warnings.append(
                f"{page.page_label} was truncated at the configured per-page text limit."
            )
            truncated = True
        remaining = settings.extraction_text_limit - total
        if remaining <= 0:
            truncated = True
            break
        if len(text) > remaining:
            text = text[:remaining]
            warnings.append("Document extraction reached the configured text limit.")
            truncated = True
        limited_page = replace(page, extracted_text=text)
        limited.append(limited_page)
        total += len(text)
    if len(pages) > settings.extraction_max_pages:
        warnings.append("Document extraction reached the configured page limit.")
        truncated = True
    return tuple(limited), total, tuple(dict.fromkeys(warnings)), truncated


def _failed(parser_name: str, parser_version: str, message: str) -> ExtractionResult:
    return ExtractionResult(
        parser_name=parser_name,
        parser_version=parser_version,
        status="failed",
        pages=(),
        character_count=0,
        error=message,
    )


def _configure_tesseract(settings: Settings) -> bool:
    if not settings.ocr_enabled:
        return False
    if settings.tesseract_command:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_command
    try:
        pytesseract.get_tesseract_version()
    except (OSError, pytesseract.TesseractNotFoundError):
        return False
    return True


def _ocr_pdf_page(page: pymupdf.Page) -> str:
    pixmap = page.get_pixmap(dpi=150, alpha=False)
    if pixmap.width * pixmap.height > 20_000_000:
        pixmap = page.get_pixmap(dpi=100, alpha=False)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    return _normalise_text(pytesseract.image_to_string(image))


def _extract_pdf(path: Path, settings: Settings) -> ExtractionResult:
    parser_name = "PyMuPDF"
    parser_version = pymupdf.VersionBind
    try:
        document = pymupdf.open(path)
    except (RuntimeError, ValueError, OSError):
        return _failed(parser_name, parser_version, "The PDF could not be parsed safely.")

    pages: list[ExtractedPage] = []
    ocr_required_pages = 0
    ocr_available = _configure_tesseract(settings)
    warnings: list[str] = []
    physical_page_count = len(document)
    try:
        for index, page in enumerate(document):
            if index >= settings.extraction_max_pages:
                warnings.append("PDF extraction reached the configured page limit.")
                break
            embedded_text = _normalise_text(page.get_text("text", sort=True))
            method = "pdf_embedded_text"
            text = embedded_text
            if not _meaningful(embedded_text):
                if ocr_available:
                    try:
                        text = _ocr_pdf_page(page)
                        method = "ocr_tesseract"
                    except (OSError, RuntimeError, pytesseract.TesseractError):
                        text = ""
                        method = "ocr_required"
                        ocr_required_pages += 1
                        warnings.append(f"Physical page {index + 1} requires OCR.")
                else:
                    text = ""
                    method = "ocr_required"
                    ocr_required_pages += 1
                    warnings.append(
                        f"Physical page {index + 1} has no meaningful embedded text; "
                        "OCR is unavailable or disabled."
                    )
            pages.append(
                ExtractedPage(
                    page_number=index + 1,
                    page_label=f"Physical PDF page {index + 1}",
                    extracted_text=text,
                    extraction_method=method,
                )
            )
    except (RuntimeError, ValueError, OSError):
        return _failed(parser_name, parser_version, "The PDF failed during text extraction.")
    finally:
        document.close()

    limited, character_count, limit_warnings, truncated = _apply_limits(pages, settings)
    truncated = truncated or physical_page_count > settings.extraction_max_pages
    warnings.extend(limit_warnings)
    if pages and ocr_required_pages == len(pages):
        status: ExtractionStatus = "ocr_required"
    elif ocr_required_pages or truncated:
        status = "partially_processed"
    else:
        status = "processed"
    return ExtractionResult(
        parser_name=parser_name,
        parser_version=parser_version,
        status=status,
        pages=limited,
        character_count=character_count,
        warnings=tuple(dict.fromkeys(warnings)),
        ocr_required=ocr_required_pages > 0,
    )


def _iter_docx_blocks(document: DocumentType):
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _table_text(table: Table) -> str:
    rows: list[str] = []
    for row in table.rows:
        values: list[str] = []
        for cell in row.cells:
            value = _normalise_text(cell.text).replace("\n", " / ")
            if value and (not values or values[-1] != value):
                values.append(value)
        if values:
            rows.append(" | ".join(values))
    return "\n".join(rows)


def _split_section(
    blocks: list[str],
    *,
    heading: str | None,
    page_number_start: int,
    maximum_characters: int,
) -> list[ExtractedPage]:
    pages: list[ExtractedPage] = []
    current: list[str] = []
    current_length = 0

    def flush() -> None:
        nonlocal current, current_length
        if not current:
            return
        page_number = page_number_start + len(pages)
        suffix = f" — {heading}" if heading else ""
        pages.append(
            ExtractedPage(
                page_number=page_number,
                page_label=f"Logical DOCX section {page_number}{suffix}",
                extracted_text="\n\n".join(current),
                extraction_method="docx_logical_section",
            )
        )
        current = []
        current_length = 0

    for block in blocks:
        for offset in range(0, max(len(block), 1), maximum_characters):
            piece = block[offset : offset + maximum_characters]
            added_length = len(piece) + (2 if current else 0)
            if current and current_length + added_length > maximum_characters:
                flush()
            current.append(piece)
            current_length += len(piece) + (2 if len(current) > 1 else 0)
    flush()
    return pages


def _extract_docx(path: Path, settings: Settings) -> ExtractionResult:
    parser_name = "python-docx"
    parser_version = docx.__version__
    try:
        document = docx.Document(path)
        sections: list[tuple[str | None, list[str]]] = []
        heading: str | None = None
        blocks: list[str] = []
        for block in _iter_docx_blocks(document):
            if isinstance(block, Paragraph):
                text = _normalise_text(block.text)
                if not text:
                    continue
                style_name = block.style.name if block.style is not None else ""
                if style_name.lower().startswith("heading"):
                    if blocks:
                        sections.append((heading, blocks))
                    heading = text
                    blocks = [text]
                else:
                    blocks.append(text)
            else:
                table_text = _table_text(block)
                if table_text:
                    blocks.append(f"Table\n{table_text}")
        if blocks:
            sections.append((heading, blocks))
    except (ValueError, KeyError, OSError, zipfile.BadZipFile):
        return _failed(parser_name, parser_version, "The DOCX could not be parsed safely.")

    pages: list[ExtractedPage] = []
    chunk_size = min(20_000, settings.extraction_page_text_limit)
    for section_heading, section_blocks in sections:
        pages.extend(
            _split_section(
                section_blocks,
                heading=section_heading,
                page_number_start=len(pages) + 1,
                maximum_characters=chunk_size,
            )
        )
    if not pages:
        pages.append(
            ExtractedPage(
                page_number=1,
                page_label="Logical DOCX section 1",
                extracted_text="",
                extraction_method="docx_logical_section",
            )
        )
    limited, character_count, warnings, truncated = _apply_limits(pages, settings)
    return ExtractionResult(
        parser_name=parser_name,
        parser_version=parser_version,
        status="partially_processed" if truncated else "processed",
        pages=limited,
        character_count=character_count,
        warnings=warnings,
    )


def _looks_utf16_without_bom(data: bytes) -> str | None:
    even = data[0::2]
    odd = data[1::2]
    even_nul_ratio = even.count(b"\x00") / max(len(even), 1)
    odd_nul_ratio = odd.count(b"\x00") / max(len(odd), 1)
    if odd_nul_ratio > 0.6 and even_nul_ratio < 0.1:
        return "utf-16-le"
    if even_nul_ratio > 0.6 and odd_nul_ratio < 0.1:
        return "utf-16-be"
    return None


def _decode_text(data: bytes, *, truncated: bool) -> tuple[str, str]:
    if data.startswith(b"\xef\xbb\xbf"):
        return data.decode("utf-8-sig"), "UTF-8 with BOM"
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16"), "UTF-16 with BOM"
    utf16 = _looks_utf16_without_bom(data)
    if utf16:
        return data.decode(utf16), utf16.upper()
    try:
        return data.decode("utf-8"), "UTF-8"
    except UnicodeDecodeError as error:
        if truncated and error.start >= len(data) - 4:
            return data[: error.start].decode("utf-8"), "UTF-8"
    match = from_bytes(data).best()
    if match is None or match.encoding is None or match.percent_chaos > 20:
        raise UnicodeError("No safe text encoding could be determined.")
    return str(match), match.encoding.upper()


def _chunk_text(value: str, maximum_characters: int) -> list[str]:
    paragraphs = re.split(r"\n{2,}", value)
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        while len(paragraph) > maximum_characters:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(paragraph[:maximum_characters])
            paragraph = paragraph[maximum_characters:]
        candidate = f"{current}\n\n{paragraph}" if current else paragraph
        if len(candidate) > maximum_characters and current:
            chunks.append(current)
            current = paragraph
        else:
            current = candidate
    if current or not chunks:
        chunks.append(current)
    return chunks


def _extract_txt(path: Path, settings: Settings) -> ExtractionResult:
    parser_name = "controlled-text-decoder"
    parser_version = "1.0"
    byte_limit = settings.extraction_text_limit * 4 + 4
    try:
        with path.open("rb") as source:
            data = source.read(byte_limit + 1)
    except OSError:
        return _failed(parser_name, parser_version, "The TXT file could not be read.")
    truncated_input = len(data) > byte_limit
    if truncated_input:
        data = data[:byte_limit]
    try:
        decoded, encoding_label = _decode_text(data, truncated=truncated_input)
    except (UnicodeError, LookupError):
        return _failed(
            parser_name,
            parser_version,
            "The TXT file could not be decoded using a controlled text encoding.",
        )
    normalized = _normalise_text(decoded, preserve_form_feed=True)
    page_limit = min(12_000, settings.extraction_page_text_limit)
    if "\f" in normalized:
        chunks = normalized.split("\f")
        labels = [f"Text page {index + 1} (form-feed)" for index in range(len(chunks))]
        method = "txt_form_feed"
    else:
        chunks = _chunk_text(normalized, page_limit)
        labels = [f"Logical text page {index + 1}" for index in range(len(chunks))]
        method = "txt_logical_page"
    pages = [
        ExtractedPage(
            page_number=index + 1,
            page_label=labels[index],
            extracted_text=_normalise_text(chunk),
            extraction_method=method,
        )
        for index, chunk in enumerate(chunks)
    ]
    limited, character_count, limit_warnings, truncated = _apply_limits(pages, settings)
    warnings = [f"Decoded as {encoding_label}."]
    if truncated_input:
        warnings.append("TXT input exceeded the configured extraction byte budget.")
    warnings.extend(limit_warnings)
    return ExtractionResult(
        parser_name=parser_name,
        parser_version=parser_version,
        status="partially_processed" if truncated_input or truncated else "processed",
        pages=limited,
        character_count=character_count,
        warnings=tuple(dict.fromkeys(warnings)),
    )


def extract_document(
    path: Path,
    content_type: str,
    settings: Settings,
) -> ExtractionResult:
    """Extract source text and page records without performing legal reasoning."""

    if content_type == "application/pdf":
        return _extract_pdf(path, settings)
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_docx(path, settings)
    if content_type == "text/plain":
        return _extract_txt(path, settings)
    return _failed("unsupported", "0", "No extractor exists for this content type.")
