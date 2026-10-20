$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# Reuse the running pilot; never kill processes merely because they own a port.
$pilotReady = $false
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8002/health/' -TimeoutSec 2
    $pilotReady = ($health.status -eq 'ok')
} catch {
    $pilotReady = $false
}
if (-not $pilotReady) {
    $djangoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\crm_django')).Path
    $pythonExe = Join-Path $djangoRoot 'venv\Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $pythonExe)) {
        throw 'Falta crm_django/venv. Crea el entorno e instala requirements.txt antes de iniciar.'
    }
    $pilotProcess = Start-Process -FilePath $pythonExe -ArgumentList @('scripts/local_pilot.py', 'serve') -WorkingDirectory $djangoRoot -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath (Join-Path $djangoRoot '.local-pilot/backend.pid') -Value $pilotProcess.Id
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8002/health/' -TimeoutSec 2
            if ($health.status -eq 'ok') { $pilotReady = $true; break }
        } catch { }
        if ($pilotProcess.HasExited) { break }
    }
    if (-not $pilotReady) {
        throw 'No se pudo iniciar la API. Revisa dependencias, migraciones y el puerto 8002; no se detuvo ningún proceso existente.'
    }
}
$env:VITE_API_URL = 'http://127.0.0.1:8002/api'
npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort
exit $LASTEXITCODE
