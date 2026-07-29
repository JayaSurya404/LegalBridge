$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable. Create server/.venv and install requirements-dev.txt first."
}

Push-Location $serverRoot
try {
    & $pythonExecutable -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    if ($LASTEXITCODE -ne 0) {
        throw "Uvicorn exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
