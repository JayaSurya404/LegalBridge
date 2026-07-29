$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
}

if (-not $pnpmCommand) {
    throw "pnpm was not found. Install the repository-declared pnpm version before starting the stack."
}
if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable."
}

function Test-PortActive {
    param([int]$Port)

    $ipProperties = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
    $listeners = $ipProperties.GetActiveTcpListeners()
    return $listeners.Port -contains $Port
}

if (Test-PortActive -Port 8000) {
    Write-Host "Port 8000 is already active; no duplicate FastAPI process was started."
}
else {
    $backendCommand = "& '$pythonExecutable' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) `
        -WorkingDirectory $serverRoot `
        -WindowStyle Normal
    Write-Host "Started FastAPI in a separate PowerShell window."
}

if (Test-PortActive -Port 3000) {
    Write-Host "Port 3000 is already active; no duplicate Next.js process was started."
}
else {
    $frontendCommand = "& '$($pnpmCommand.Source)' --filter @legalbridge/client dev"
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand) `
        -WorkingDirectory $repositoryRoot `
        -WindowStyle Normal
    Write-Host "Started Next.js in a separate PowerShell window."
}

Write-Host ""
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend Swagger: http://127.0.0.1:8000/docs"
Write-Host "Workspace: legalbridge-main"
Write-Host "Primary admin: legalbridge@legalbridge.demo / legalbridge@2026"
