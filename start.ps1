<#
.SYNOPSIS
  Startet FinanceConsulter: Backend (http://127.0.0.1:8000) und Frontend (http://localhost:3000).

.DESCRIPTION
  Richtet beim ersten Start alles ein (Python-venv, Pakete, npm-Module) und startet Backend
  und Frontend in eigenen Fenstern. Der Browser öffnet sich automatisch.

.PARAMETER Full
  Installiert zusätzlich die ML-Pakete (Belegscan, KI-Kategorisierung; mehrere GB).

.EXAMPLE
  .\start.ps1          # API + Frontend (ohne ML-Pakete)
  .\start.ps1 -Full    # zusätzlich ML-Pakete
#>
param([switch]$Full)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Venv = Join-Path $Root '.venv'
$Py = Join-Path $Venv 'Scripts\python.exe'
$AppDir = Join-Path $Root 'backend\app'
$Frontend = Join-Path $Root 'financeconsulter'

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

# --- Voraussetzungen ---------------------------------------------------------------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js (npm) wurde nicht gefunden. Bitte Node.js LTS installieren: https://nodejs.org'
}

# --- Python-Umgebung ---------------------------------------------------------------
if (-not (Test-Path $Py)) {
    Step 'Erstelle Python-Umgebung (.venv)'
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv $Venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv $Venv }
    else { throw 'Python 3.10+ wurde nicht gefunden. Bitte installieren: https://www.python.org/downloads/' }
    if (-not (Test-Path $Py)) { throw 'Die Python-Umgebung konnte nicht erstellt werden.' }
}

$ReqFile = if ($Full) { 'backend\requirements.txt' } else { 'backend\requirements-core.txt' }
$ReqHash = (Get-FileHash (Join-Path $Root 'backend\requirements-core.txt')).Hash + (Get-FileHash (Join-Path $Root $ReqFile)).Hash
$Stamp = Join-Path $Venv ".installed-$([IO.Path]::GetFileNameWithoutExtension($ReqFile))"
if (-not (Test-Path $Stamp) -or (Get-Content $Stamp -Raw).Trim() -ne $ReqHash) {
    Step "Installiere Python-Pakete ($ReqFile)"
    & $Py -m pip install --disable-pip-version-check -q --upgrade pip
    & $Py -m pip install --disable-pip-version-check -q -r (Join-Path $Root $ReqFile)
    if ($LASTEXITCODE -ne 0) { throw 'pip install ist fehlgeschlagen.' }
    Set-Content -Path $Stamp -Value $ReqHash
}

# --- Frontend-Pakete ---------------------------------------------------------------
$Lock = Join-Path $Frontend 'package-lock.json'
$Installed = Join-Path $Frontend 'node_modules\.package-lock.json'
if (-not (Test-Path $Installed) -or (Get-Item $Lock).LastWriteTime -gt (Get-Item $Installed).LastWriteTime) {
    Step 'Installiere Frontend-Pakete (npm install)'
    Push-Location $Frontend
    try { & npm install --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm install ist fehlgeschlagen.' } }
    finally { Pop-Location }
}

# --- Starten -------------------------------------------------------------------------
$PortBusy = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($PortBusy) { throw 'Port 8000 ist belegt (läuft das Backend schon?). Bitte das andere Fenster schließen.' }

Step 'Starte Backend (neues Fenster)'
Start-Process -FilePath $Py -WorkingDirectory $AppDir -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000')

$ready = $false
for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    Start-Sleep -Seconds 1
    try { $ready = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8000/health').StatusCode -eq 200 } catch { }
}
if (-not $ready) { throw 'Das Backend ist nicht gestartet. Bitte die Meldungen im Backend-Fenster prüfen.' }

Step 'Starte Frontend (neues Fenster, der Browser öffnet sich automatisch)'
Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Frontend -ArgumentList @('/k', 'npm start')

Write-Host ''
Write-Host 'FinanceConsulter läuft:' -ForegroundColor Green
Write-Host '  App:      http://localhost:3000'
Write-Host '  API-Doku: http://127.0.0.1:8000/docs'
Write-Host 'Beenden: die beiden geöffneten Fenster schließen.'
