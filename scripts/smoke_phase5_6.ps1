param(
    [ValidateRange(8765, 8799)]
    [int]$Port = 8766
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serverRoot = Join-Path $repositoryRoot "server"
$pythonExecutable = Join-Path $serverRoot ".venv\Scripts\python.exe"
$smokeRoot = Join-Path $serverRoot "data\smoke-temp"
$temporaryFile = Join-Path $smokeRoot "phase5-6-smoke.txt"
$backendProcess = $null
$httpClient = $null
$createdCaseId = $null
$headers = $null

if (-not (Test-Path -LiteralPath $pythonExecutable -PathType Leaf)) {
    throw "Backend virtual environment not found at $pythonExecutable."
}

function Test-PortActive {
    param([int]$CandidatePort)

    $ipProperties = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
    $listeners = $ipProperties.GetActiveTcpListeners()
    return $listeners.Port -contains $CandidatePort
}

function New-MultipartUpload {
    param(
        [System.Net.Http.HttpClient]$Client,
        [string]$Uri,
        [byte[]]$Bytes,
        [string]$Filename
    )

    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $fileContent = [System.Net.Http.ByteArrayContent]::new($Bytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("text/plain")
    $multipart.Add($fileContent, "file", $Filename)
    $multipart.Add([System.Net.Http.StringContent]::new("smoke test"), "category")
    try {
        return $Client.PostAsync($Uri, $multipart).GetAwaiter().GetResult()
    }
    finally {
        $multipart.Dispose()
    }
}

$candidatePorts = @($Port) + (8765..8799 | Where-Object { $_ -ne $Port })
$selectedPort = $candidatePorts |
    Where-Object { -not (Test-PortActive -CandidatePort $_) } |
    Select-Object -First 1

if (-not $selectedPort) {
    throw "No free Phase 5-6 smoke-test port was found between 8765 and 8799."
}

$backendBaseUrl = "http://127.0.0.1:$selectedPort"

try {
    New-Item -ItemType Directory -Path $smokeRoot -Force | Out-Null
    $text = @"
SYNTHETIC PHASE 5-6 LIVE SMOKE DOCUMENT
Not an official record. No real person or confidential data.
This exact text must survive upload, extraction, persistence, and download.
"@
    $sourceBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
    [System.IO.File]::WriteAllBytes($temporaryFile, $sourceBytes)

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
    for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
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

    $caseNumber = "SMOKE-P56-$([guid]::NewGuid().ToString('N').Substring(0, 12).ToUpperInvariant())"
    $caseBody = @{
        case_number = $caseNumber
        title = "Synthetic Phase 5-6 live smoke case"
        description = "Temporary synthetic ingestion verification; no real client data."
        court_name = "Synthetic smoke forum"
        jurisdiction = "Synthetic test jurisdiction"
        allegation_type = "Technical ingestion verification"
        status = "draft"
        assigned_attorney_id = $tokens.user.id
    } | ConvertTo-Json
    $createdCase = Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/cases" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $caseBody
    $createdCaseId = $createdCase.id

    $httpClient = [System.Net.Http.HttpClient]::new()
    $httpClient.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
        "Bearer",
        $tokens.access_token
    )
    $uploadUri = "$backendBaseUrl/api/v1/cases/$createdCaseId/documents/upload"
    $uploadResponse = New-MultipartUpload `
        -Client $httpClient `
        -Uri $uploadUri `
        -Bytes $sourceBytes `
        -Filename "phase5-6-smoke.txt"
    if (-not $uploadResponse.IsSuccessStatusCode) {
        throw "Live upload failed with HTTP $([int]$uploadResponse.StatusCode)."
    }
    $uploaded = $uploadResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    $uploadResponse.Dispose()
    if ($uploaded.extraction_status -ne "processed") {
        throw "Uploaded TXT did not reach processed status."
    }
    if (-not ($uploaded.pages | Where-Object { $_.extracted_text -like "*exact text must survive*" })) {
        throw "Persisted extracted pages did not contain the source text."
    }

    $downloadedBytes = $httpClient.GetByteArrayAsync(
        "$backendBaseUrl/api/v1/cases/$createdCaseId/documents/$($uploaded.id)/download"
    ).GetAwaiter().GetResult()
    if (
        [Convert]::ToBase64String($sourceBytes) -ne
        [Convert]::ToBase64String($downloadedBytes)
    ) {
        throw "Downloaded original bytes did not match the uploaded bytes."
    }

    $duplicateResponse = New-MultipartUpload `
        -Client $httpClient `
        -Uri $uploadUri `
        -Bytes $sourceBytes `
        -Filename "phase5-6-smoke-duplicate.txt"
    if ([int]$duplicateResponse.StatusCode -ne 409) {
        throw "Duplicate binary upload did not return HTTP 409."
    }
    $duplicateResponse.Dispose()

    $deleteResponse = $httpClient.DeleteAsync(
        "$backendBaseUrl/api/v1/cases/$createdCaseId/documents/$($uploaded.id)"
    ).GetAwaiter().GetResult()
    if ([int]$deleteResponse.StatusCode -ne 204) {
        throw "Smoke document deletion did not return HTTP 204."
    }
    $deleteResponse.Dispose()

    Invoke-RestMethod `
        -Uri "$backendBaseUrl/api/v1/cases/$createdCaseId/archive" `
        -Method Post `
        -Headers $headers | Out-Null
    $createdCaseId = $null

    Write-Host "Phase 5-6 live smoke test passed on $backendBaseUrl."
    Write-Host "Verified byte upload, extraction, persisted pages, byte-equal download, duplicate rejection, deletion, and synthetic-case archival."
}
finally {
    if ($createdCaseId -and $headers) {
        try {
            Invoke-RestMethod `
                -Uri "$backendBaseUrl/api/v1/cases/$createdCaseId/archive" `
                -Method Post `
                -Headers $headers | Out-Null
        }
        catch {
            Write-Warning "The clearly synthetic smoke case could not be archived during cleanup."
        }
    }
    if ($httpClient) {
        $httpClient.Dispose()
    }
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        $backendProcess.WaitForExit()
    }
    if (Test-Path -LiteralPath $temporaryFile -PathType Leaf) {
        Remove-Item -LiteralPath $temporaryFile -Force
    }
    if (Test-Path -LiteralPath $smokeRoot -PathType Container) {
        $remaining = Get-ChildItem -LiteralPath $smokeRoot -Force
        if (-not $remaining) {
            Remove-Item -LiteralPath $smokeRoot -Force
        }
    }
}
