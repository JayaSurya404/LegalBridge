$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable. Create server/.venv and install requirements-dev.txt first."
}

Push-Location $serverRoot
try {
    & $pythonExecutable -m ruff check --fix --no-cache app tests alembic
    if ($LASTEXITCODE -ne 0) {
        throw "Ruff safe fixes failed with code $LASTEXITCODE."
    }

    & $pythonExecutable -m ruff format --no-cache app tests alembic
    if ($LASTEXITCODE -ne 0) {
        throw "Ruff formatting failed with code $LASTEXITCODE."
    }

    & $pythonExecutable -m ruff check --no-cache app tests alembic
    if ($LASTEXITCODE -ne 0) {
        throw "Final Ruff check failed with code $LASTEXITCODE."
    }

    & $pythonExecutable -m pytest tests
    if ($LASTEXITCODE -ne 0) {
        throw "pytest failed with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
