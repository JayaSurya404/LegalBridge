param(
    [ValidateRange(8765, 8799)]
    [int]$Port = 8765
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"
$backendProcess = $null

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable."
}

function Test-PortActive {
    param([int]$CandidatePort)

    $ipProperties = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
    $listeners = $ipProperties.GetActiveTcpListeners()
    return $listeners.Port -contains $CandidatePort
}

$candidatePorts = @($Port) + (8765..8799 | Where-Object { $_ -ne $Port })
$selectedPort = $candidatePorts |
    Where-Object { -not (Test-PortActive -CandidatePort $_) } |
    Select-Object -First 1

if (-not $selectedPort) {
    throw "No free Phase 4 smoke-test port was found between 8765 and 8799."
}

$backendBaseUrl = "http://127.0.0.1:$selectedPort"

try {
    $backendProcess = Start-Process `
        -FilePath $pythonExecutable `
        -ArgumentList @(
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "$selectedPort"
        ) `
        -WorkingDirectory $serverRoot `
        -WindowStyle Hidden `
        -PassThru

    $healthy = $false
    for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
        try {
            $health = Invoke-RestMethod `
                -Uri "$backendBaseUrl/api/v1/health" `
                -Method Get `
                -TimeoutSec 2
            if ($health.status -eq "ok") {
                $healthy = $true
                break
            }
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $healthy) {
        throw "Temporary FastAPI process did not become healthy."
    }

    $loginBody = @{
        organization_slug = "legalbridge-demo"
        email = "attorney@legalbridge.demo"
        password = "LegalBridge@2026"
    } | ConvertTo-Json
    $tokens = Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $headers = @{ Authorization = "Bearer $($tokens.access_token)" }
    $currentUser = Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/auth/me" `
        -Method Get `
        -Headers $headers
    if ($currentUser.email -ne "attorney@legalbridge.demo") {
        throw "The authenticated user response did not match the demo attorney."
    }

    $cases = Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/cases" `
        -Method Get `
        -Headers $headers
    if (-not ($cases | Where-Object { $_.case_number -eq "LB-DEMO-2026-001" })) {
        throw "The persistent demonstration case was not returned."
    }

    $refreshBody = @{
        refresh_token = $tokens.refresh_token
    } | ConvertTo-Json
    $rotated = Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/auth/refresh" `
        -Method Post `
        -ContentType "application/json" `
        -Body $refreshBody
    if ($rotated.refresh_token -eq $tokens.refresh_token) {
        throw "Refresh-token rotation did not issue a replacement token."
    }

    Write-Host "Phase 4 smoke test passed on $backendBaseUrl."
    Write-Host "Verified health, login, /auth/me, persistent cases, and refresh rotation."
}
finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        $backendProcess.WaitForExit()
    }
}
