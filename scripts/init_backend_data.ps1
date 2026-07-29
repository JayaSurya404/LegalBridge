$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable. Install server requirements first."
}

Push-Location $serverRoot
try {
    & $pythonExecutable -c "from app.core.config import get_settings; raise SystemExit(0 if get_settings().database_url.startswith('postgresql+asyncpg://') else 2)"
    if ($LASTEXITCODE -ne 0) {
        throw "Hosted jury initialization requires an active PostgreSQL DATABASE_URL. SQLite remains the application fallback but is not accepted by this command."
    }

    Write-Host "Database engine: PostgreSQL"
    & $pythonExecutable -m alembic current
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect the current Alembic revision."
    }

    & $pythonExecutable -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        throw "Alembic migration failed with code $LASTEXITCODE."
    }

    & $pythonExecutable -m alembic current
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to confirm the upgraded Alembic revision."
    }

    & $pythonExecutable -m app.scripts.bootstrap_main
    if ($LASTEXITCODE -ne 0) {
        throw "Jury workspace bootstrap failed with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
