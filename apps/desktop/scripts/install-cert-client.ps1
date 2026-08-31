<#
.SYNOPSIS
    Instala el certificado público de Serviteca POS en el almacén de confianza de Windows en un equipo cliente.

.DESCRIPTION
    Agrega el certificado público (.cer) a:
    - Entidades de certificación raíz de confianza (LocalMachine\Root / CurrentUser\Root)
    - Editores de confianza (LocalMachine\TrustedPublisher / CurrentUser\TrustedPublisher)
    Esto elimina las advertencias de publicador desconocido y bloqueos de Smart App Control.

.PARAMETER CertPath
    Ruta opcional al archivo .cer. Si no se especifica, busca en ../certs/ServitecaPOS-Public.cer

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-cert-client.ps1
    powershell -ExecutionPolicy Bypass -File .\install-cert-client.ps1 -CertPath "C:\Ruta\ServitecaPOS-Public.cer"
#>

param (
    [string]$CertPath = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $CertPath) {
    $desktopDir = Split-Path -Parent $scriptDir
    $CertPath = Join-Path $desktopDir "certs\ServitecaPOS-Public.cer"
    if (-not (Test-Path $CertPath)) {
        # Si se distribuye junto al script
        $CertPath = Join-Path $scriptDir "ServitecaPOS-Public.cer"
    }
}

if (-not (Test-Path $CertPath)) {
    Write-Error "No se encontró el archivo de certificado en '$CertPath'. Asegúrate de proporcionar la ruta correcta."
    exit 1
}

Write-Host ""
Write-Host "=== Instalador de Certificado de Confianza - Serviteca POS ===" -ForegroundColor Cyan
Write-Host "Certificado: $CertPath"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "[INFO] Ejecutando como Administrador (Instalación para toda la máquina)..." -ForegroundColor Yellow
    Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null
    Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null
    Write-Host "[EXITO] Certificado instalado en LocalMachine\Root y LocalMachine\TrustedPublisher." -ForegroundColor Green
} else {
    Write-Host "[INFO] Ejecutando como Usuario actual (CurrentUser)..." -ForegroundColor Yellow
    Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
    Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null
    Write-Host "[EXITO] Certificado instalado en CurrentUser\Root y CurrentUser\TrustedPublisher." -ForegroundColor Green
    Write-Host "[SUGERENCIA] Para aplicarlo a todos los usuarios de la PC, ejecuta este script abriendo PowerShell como Administrador." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "La aplicación Serviteca POS ahora está registrada como de confianza en este equipo." -ForegroundColor Green
Write-Host ""
