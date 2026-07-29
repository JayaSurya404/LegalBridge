$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable. Install server requirements first."
}

Push-Location $serverRoot
try {
    & $pythonExecutable -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        throw "Alembic migration failed with code $LASTEXITCODE."
    }

    & $pythonExecutable -m app.scripts.bootstrap_demo
    if ($LASTEXITCODE -ne 0) {
        throw "Demo bootstrap failed with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
