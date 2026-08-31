<#
.SYNOPSIS
    Diagnostico (solo lectura) del bloqueo de Smart App Control / SmartScreen para Serviteca POS.

.DESCRIPTION
    No modifica nada. Reporta:
      1. El estado de Smart App Control (SAC) en este equipo.
      2. Si el ejecutable / instalador tiene "marca de internet" (Zone.Identifier).
    Y luego imprime el procedimiento de desbloqueo recomendado segun el caso.

    Ver: apps/desktop/docs/smart_app_control_bloqueo.md

.PARAMETER Path
    Ruta al .exe a inspeccionar. Por defecto:
    C:\Program Files\Serviteca POS\Serviteca POS.exe

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\check-smart-app-control.ps1
    powershell -ExecutionPolicy Bypass -File .\check-smart-app-control.ps1 -Path "D:\Descargas\Serviteca POS-Setup-1.0.53.exe"
#>

param (
    [string]$Path = "C:\Program Files\Serviteca POS\Serviteca POS.exe"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== Diagnostico Smart App Control / SmartScreen - Serviteca POS ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Estado de Smart App Control ---
$sacKey = "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy"
$sac = $null
try {
    $sac = (Get-ItemProperty -Path $sacKey -Name VerifiedAndReputablePolicyState -ErrorAction Stop).VerifiedAndReputablePolicyState
} catch {
    $sac = $null
}

$sacText = switch ($sac) {
    0       { "OFF (desactivado)" }
    1       { "ON / ENFORCEMENT (bloquea en serio)" }
    2       { "EVALUATION (modo aprendizaje, normalmente no bloquea)" }
    default { "no disponible (Windows anterior a 11 22H2, o clave ausente)" }
}
Write-Host "Smart App Control : $sacText" -ForegroundColor $(if ($sac -eq 1) { "Red" } elseif ($sac -eq 0) { "Green" } else { "Yellow" })

# --- 2. Marca de internet (Zone.Identifier) ---
Write-Host ""
if (Test-Path -LiteralPath $Path) {
    Write-Host "Archivo inspeccionado : $Path"
    $zone = $null
    try {
        $zone = Get-Content -LiteralPath $Path -Stream Zone.Identifier -ErrorAction Stop
    } catch {
        $zone = $null
    }
    if ($zone) {
        Write-Host "Marca de internet     : SI (el archivo se considera 'descargado')" -ForegroundColor Yellow
        Write-Host "  -> Se puede quitar con:  Unblock-File -Path `"$Path`""
    } else {
        Write-Host "Marca de internet     : no" -ForegroundColor Green
    }
} else {
    Write-Host "Archivo inspeccionado : NO encontrado en '$Path'" -ForegroundColor Yellow
    Write-Host "  -> Pasa la ruta real con:  -Path `"C:\ruta\al\Serviteca POS.exe`""
}

# --- 3. Recomendacion ---
Write-Host ""
Write-Host "=== Que hacer ===" -ForegroundColor Cyan
if ($sac -eq 1) {
    Write-Host "SAC esta en ENFORCEMENT. Reintentar NO sirve." -ForegroundColor Red
    Write-Host "  1. Menu Inicio -> Seguridad de Windows"
    Write-Host "  2. Control de aplicaciones y explorador -> Configuracion de Control inteligente de aplicaciones"
    Write-Host "  3. Cambiar a 'Desactivado'"
    Write-Host "  OJO: reactivar SAC requiere restablecer/reinstalar Windows. Debe hacerlo alguien autorizado."
} else {
    Write-Host "El bloqueo (si lo hay) es de SmartScreen / reputacion. Opciones:" -ForegroundColor Green
    Write-Host "  A. En el aviso 'Windows protegio tu PC' -> 'Mas informacion' -> 'Ejecutar de todas formas'."
    Write-Host "  B. Cerrar el aviso, esperar 1-2 min o reiniciar el equipo, y reintentar."
    Write-Host "  C. Si el instalador vino por USB/red:  Unblock-File -Path `"<ruta al instalador>`""
}
Write-Host ""
Write-Host "Solucion de fondo: enviar cada release a https://www.microsoft.com/en-us/wdsi/filesubmission"
Write-Host "Detalle completo : apps/desktop/docs/smart_app_control_bloqueo.md"
Write-Host ""
