"""Private local binary storage with streamed staging and signature validation."""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

ALLOWED_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
}
CHUNK_SIZE = 1024 * 1024
SAFE_COMPONENT = re.compile(r"^[A-Za-z0-9-]{1,100}$")


class DocumentValidationError(Exception):
    """A safe validation failure suitable for a controlled API response."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


@dataclass(frozen=True)
class StagedUpload:
    temporary_path: Path
    extension: str
    content_type: str
    size_bytes: int
    sha256: str


class StorageService:
    """Store opaque document binaries under an application-owned root."""

    def __init__(self, root: Path, max_upload_bytes: int) -> None:
        self.root = root.expanduser().resolve()
        self.max_upload_bytes = max_upload_bytes
        self.staging_root = self.root / ".staging"
        self.quarantine_root = self.root / ".quarantine"

    def ensure_ready(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self.staging_root.mkdir(parents=True, exist_ok=True)
        self.quarantine_root.mkdir(parents=True, exist_ok=True)

    def is_ready(self) -> bool:
        try:
            self.ensure_ready()
            descriptor, candidate = tempfile.mkstemp(
                prefix="readiness-",
                suffix=".tmp",
                dir=self.staging_root,
            )
            os.close(descriptor)
            Path(candidate).unlink(missing_ok=True)
        except OSError:
            return False
        return True

    @staticmethod
    def validate_upload_metadata(filename: str | None, content_type: str | None) -> str:
        if not filename:
            raise DocumentValidationError(
                400,
                "missing_filename",
                "A filename is required.",
            )
        if (
            filename != filename.strip()
            or filename in {".", ".."}
            or "/" in filename
            or "\\" in filename
            or any(ord(character) < 32 or ord(character) == 127 for character in filename)
        ):
            raise DocumentValidationError(
                400,
                "unsafe_filename",
                "Filename must not contain a path, surrounding whitespace, or control characters.",
            )
        if len(filename) > 255:
            raise DocumentValidationError(
                400,
                "unsafe_filename",
                "Filename must be 255 characters or fewer.",
            )
        extension = Path(filename).suffix.lower()
        expected_content_type = ALLOWED_CONTENT_TYPES.get(extension)
        if expected_content_type is None:
            raise DocumentValidationError(
                400,
                "unsupported_extension",
                "Only PDF, DOCX, and TXT files are accepted.",
            )
        declared = (content_type or "").split(";", 1)[0].strip().lower()
        if declared != expected_content_type:
            raise DocumentValidationError(
                400,
                "content_type_mismatch",
                f"The declared MIME type must be {expected_content_type} for {extension} files.",
            )
        return extension

    async def stage_upload(self, upload: UploadFile) -> StagedUpload:
        extension = self.validate_upload_metadata(upload.filename, upload.content_type)
        self.ensure_ready()
        descriptor, temporary_name = tempfile.mkstemp(
            prefix="upload-",
            suffix=".part",
            dir=self.staging_root,
        )
        temporary_path = Path(temporary_name)
        size_bytes = 0
        digest = hashlib.sha256()
        try:
            with os.fdopen(descriptor, "wb") as target:
                while chunk := await upload.read(CHUNK_SIZE):
                    size_bytes += len(chunk)
                    if size_bytes > self.max_upload_bytes:
                        raise DocumentValidationError(
                            413,
                            "upload_too_large",
                            f"Files must not exceed {self.max_upload_bytes} bytes.",
                        )
                    digest.update(chunk)
                    target.write(chunk)
                target.flush()
                os.fsync(target.fileno())
            if size_bytes == 0:
                raise DocumentValidationError(
                    400,
                    "empty_file",
                    "Empty files are not accepted.",
                )
            self._validate_signature(temporary_path, extension)
            return StagedUpload(
                temporary_path=temporary_path,
                extension=extension,
                content_type=ALLOWED_CONTENT_TYPES[extension],
                size_bytes=size_bytes,
                sha256=digest.hexdigest(),
            )
        except Exception:
            await run_in_threadpool(temporary_path.unlink, missing_ok=True)
            raise

    def stage_file(
        self,
        source: Path,
        *,
        filename: str,
        content_type: str,
    ) -> StagedUpload:
        extension = self.validate_upload_metadata(filename, content_type)
        self.ensure_ready()
        descriptor, temporary_name = tempfile.mkstemp(
            prefix="bootstrap-",
            suffix=".part",
            dir=self.staging_root,
        )
        temporary_path = Path(temporary_name)
        size_bytes = 0
        digest = hashlib.sha256()
        try:
            with source.open("rb") as source_file, os.fdopen(descriptor, "wb") as target:
                while chunk := source_file.read(CHUNK_SIZE):
                    size_bytes += len(chunk)
                    if size_bytes > self.max_upload_bytes:
                        raise DocumentValidationError(
                            413,
                            "upload_too_large",
                            f"Files must not exceed {self.max_upload_bytes} bytes.",
                        )
                    digest.update(chunk)
                    target.write(chunk)
                target.flush()
                os.fsync(target.fileno())
            if size_bytes == 0:
                raise DocumentValidationError(400, "empty_file", "Empty files are not accepted.")
            self._validate_signature(temporary_path, extension)
            return StagedUpload(
                temporary_path=temporary_path,
                extension=extension,
                content_type=ALLOWED_CONTENT_TYPES[extension],
                size_bytes=size_bytes,
                sha256=digest.hexdigest(),
            )
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise

    def finalize(
        self,
        staged: StagedUpload,
        *,
        organization_id: str,
        case_id: str,
        document_id: str,
    ) -> str:
        for component in (organization_id, case_id, document_id):
            if not SAFE_COMPONENT.fullmatch(component):
                raise ValueError("Storage identifiers must be opaque safe components.")
        relative = Path(organization_id) / case_id / document_id / f"original{staged.extension}"
        final_path = self._resolve_key(relative.as_posix())
        final_path.parent.mkdir(parents=True, exist_ok=True)
        if final_path.exists():
            raise FileExistsError("A stored binary already exists for this document.")
        os.replace(staged.temporary_path, final_path)
        return relative.as_posix()

    def discard(self, staged: StagedUpload) -> None:
        staged.temporary_path.unlink(missing_ok=True)

    def binary_exists(self, storage_key: str | None) -> bool:
        return bool(storage_key and self._resolve_key(storage_key).is_file())

    def path_for_key(self, storage_key: str) -> Path:
        path = self._resolve_key(storage_key)
        if not path.is_file():
            raise FileNotFoundError("Stored document binary was not found.")
        return path

    def delete_key(self, storage_key: str | None) -> None:
        if not storage_key:
            return
        path = self._resolve_key(storage_key)
        path.unlink(missing_ok=True)
        self._remove_empty_parents(path.parent)

    def quarantine(self, storage_key: str | None) -> tuple[Path, Path] | None:
        if not storage_key:
            return None
        original = self._resolve_key(storage_key)
        if not original.exists():
            return None
        self.ensure_ready()
        quarantined = self.quarantine_root / f"{original.parent.name}-{original.name}.deleted"
        if quarantined.exists():
            quarantined = self.quarantine_root / f"{uuid4()}.deleted"
        os.replace(original, quarantined)
        return original, quarantined

    def restore_quarantined(self, paths: tuple[Path, Path] | None) -> None:
        if paths is None:
            return
        original, quarantined = paths
        if quarantined.exists():
            original.parent.mkdir(parents=True, exist_ok=True)
            os.replace(quarantined, original)

    def purge_quarantined(self, paths: tuple[Path, Path] | None) -> None:
        if paths is None:
            return
        original, quarantined = paths
        quarantined.unlink(missing_ok=True)
        self._remove_empty_parents(original.parent)

    def _resolve_key(self, storage_key: str) -> Path:
        relative = Path(storage_key)
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("Invalid storage key.")
        candidate = (self.root / relative).resolve()
        if not candidate.is_relative_to(self.root):
            raise ValueError("Storage key escapes the configured root.")
        return candidate

    def _remove_empty_parents(self, start: Path) -> None:
        current = start
        while current != self.root:
            try:
                current.rmdir()
            except OSError:
                break
            current = current.parent

    def _validate_signature(self, path: Path, extension: str) -> None:
        if extension == ".pdf":
            with path.open("rb") as source:
                if source.read(5) != b"%PDF-":
                    raise DocumentValidationError(
                        400,
                        "invalid_pdf_signature",
                        "The file does not contain a valid PDF signature.",
                    )
            return
        if extension == ".docx":
            self._validate_docx_container(path)
            return
        self._validate_text_signature(path)

    def _validate_docx_container(self, path: Path) -> None:
        try:
            with zipfile.ZipFile(path) as archive:
                entries = archive.infolist()
                names = {entry.filename for entry in entries}
                required = {"[Content_Types].xml", "word/document.xml"}
                if not required.issubset(names):
                    raise DocumentValidationError(
                        400,
                        "invalid_docx_container",
                        "The DOCX container is missing required Office document entries.",
                    )
                if len(entries) > 5_000:
                    raise DocumentValidationError(
                        400,
                        "unsafe_docx_container",
                        "The DOCX container contains too many entries.",
                    )
                uncompressed_limit = max(self.max_upload_bytes * 4, 100 * 1024 * 1024)
                uncompressed_total = 0
                for entry in entries:
                    entry_path = PurePosixPath(entry.filename)
                    if entry_path.is_absolute() or ".." in entry_path.parts:
                        raise DocumentValidationError(
                            400,
                            "unsafe_docx_container",
                            "The DOCX container contains an unsafe entry path.",
                        )
                    uncompressed_total += entry.file_size
                    if uncompressed_total > uncompressed_limit:
                        raise DocumentValidationError(
                            400,
                            "unsafe_docx_container",
                            "The DOCX container expands beyond the safe processing limit.",
                        )
                    if (
                        entry.compress_size > 0
                        and entry.file_size > 10 * 1024 * 1024
                        and entry.file_size / entry.compress_size > 200
                    ):
                        raise DocumentValidationError(
                            400,
                            "unsafe_docx_container",
                            "The DOCX container has an unsafe compression ratio.",
                        )
                archive.testzip()
        except DocumentValidationError:
            raise
        except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
            raise DocumentValidationError(
                400,
                "invalid_docx_container",
                "The file is not a valid DOCX container.",
            ) from exc

    @staticmethod
    def _validate_text_signature(path: Path) -> None:
        with path.open("rb") as source:
            sample = source.read(256 * 1024)
        if sample.startswith((b"\xff\xfe", b"\xfe\xff")):
            try:
                sample.decode("utf-16")
            except UnicodeDecodeError as exc:
                raise DocumentValidationError(
                    400,
                    "invalid_text_encoding",
                    "The TXT file has an invalid UTF-16 encoding.",
                ) from exc
            return
        nul_ratio = sample.count(b"\x00") / max(len(sample), 1)
        even_nuls = sample[0::2].count(b"\x00") / max(len(sample[0::2]), 1)
        odd_nuls = sample[1::2].count(b"\x00") / max(len(sample[1::2]), 1)
        looks_utf16 = max(even_nuls, odd_nuls) > 0.6 and min(even_nuls, odd_nuls) < 0.1
        if nul_ratio > 0.01 and not looks_utf16:
            raise DocumentValidationError(
                400,
                "binary_text_file",
                "The TXT selection appears to contain binary content.",
            )
        disallowed = sum(byte < 9 or 13 < byte < 32 for byte in sample if byte != 0)
        if disallowed / max(len(sample), 1) > 0.02:
            raise DocumentValidationError(
                400,
                "binary_text_file",
                "The TXT selection contains too many binary control bytes.",
            )
