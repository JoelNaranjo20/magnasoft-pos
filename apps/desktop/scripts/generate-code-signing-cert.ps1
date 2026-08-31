<#
.SYNOPSIS
    Genera un certificado autofirmado de Code Signing (Firma de Código) para Serviteca POS.

.DESCRIPTION
    Crea un certificado con validez de 5 años y OID de Firma de Código,
    exportando:
    1. certs/ServitecaPOS.pfx (Clave privada para compilar y firmar con electron-builder)
    2. certs/ServitecaPOS-Public.cer (Clave pública para distribuir e instalar en terminales cliente)

.PARAMETER Password
    Contraseña para proteger el archivo .pfx. Si se omite, se toma de
    CSC_KEY_PASSWORD en apps/desktop/.env.local, luego de la variable de entorno
    CSC_KEY_PASSWORD, y como último recurso se solicita de forma interactiva.
    Nunca se hardcodea en el script.

.EXAMPLE
    .\generate-code-signing-cert.ps1
    .\generate-code-signing-cert.ps1 -Password "MiPasswordSeguro123"
#>

param (
    [string]$Password = "",
    [string]$Subject = "CN=Magnasoft - Serviteca POS, O=Magnasoft, C=CO"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopDir = Split-Path -Parent $scriptDir
$certsDir = Join-Path $desktopDir "certs"

# Resolver la contraseña del .pfx sin hardcodearla:
# 1) parámetro -Password  2) CSC_KEY_PASSWORD en apps/desktop/.env.local
# 3) variable de entorno CSC_KEY_PASSWORD  4) solicitud interactiva
if (-not $Password) {
    $envFile = Join-Path $desktopDir ".env.local"
    if (Test-Path $envFile) {
        $pwMatch = Get-Content $envFile | Select-String '^CSC_KEY_PASSWORD=(.+)'
        if ($pwMatch) { $Password = $pwMatch.Matches.Groups[1].Value.Trim() }
    }
}
if (-not $Password -and $env:CSC_KEY_PASSWORD) {
    $Password = $env:CSC_KEY_PASSWORD
}
if (-not $Password) {
    $secure = Read-Host "Contraseña para proteger el .pfx" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
if (-not $Password) {
    Write-Error "No se proporcionó contraseña para el .pfx."
    exit 1
}

if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
    Write-Host "[OK] Directorio creado: $certsDir" -ForegroundColor Green
}

$pfxPath = Join-Path $certsDir "ServitecaPOS.pfx"
$cerPath = Join-Path $certsDir "ServitecaPOS-Public.cer"

Write-Host ""
Write-Host "=== Generando Certificado de Firma de Codigo (Code Signing) ===" -ForegroundColor Cyan
Write-Host "Subject: $Subject"
Write-Host "Validez: 5 anios"

# Crear Certificado en almacen del usuario
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $Subject -KeyAlgorithm RSA -KeyLength 2048 -KeyUsage DigitalSignature -KeySpec Signature -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(5) -FriendlyName "Magnasoft Serviteca POS Code Signing"

Write-Host "[OK] Certificado generado con Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Exportar PFX con contrasenia
$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Write-Host "[OK] Archivo PFX exportado: $pfxPath" -ForegroundColor Green

# Exportar CER publico
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
Write-Host "[OK] Archivo CER publico exportado: $cerPath" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host " CONFIGURACION LISTA PARA ELECTRON-BUILDER" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "Agrega o verifica en apps/desktop/.env.local (no se versiona):"
Write-Host "CSC_LINK=certs/ServitecaPOS.pfx" -ForegroundColor White
Write-Host "CSC_KEY_PASSWORD=<la contraseña que acabas de usar>" -ForegroundColor White
Write-Host ""
Write-Host "Para registrar la confianza del certificado en este u otros equipos:" -ForegroundColor Cyan
Write-Host "Ejecuta: powershell -ExecutionPolicy Bypass -File .\install-cert-client.ps1" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""
