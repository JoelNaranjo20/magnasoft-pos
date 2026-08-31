$envFile = Join-Path $PSScriptRoot ".env.local"

if (Test-Path $envFile) {
    # Cargar GH_TOKEN
    $ghMatch = Get-Content $envFile | Select-String '^GH_TOKEN=(.+)'
    if ($ghMatch) {
        $env:GH_TOKEN = $ghMatch.Matches.Groups[1].Value.Trim()
    }

    # Cargar CSC_LINK
    $cscLinkMatch = Get-Content $envFile | Select-String '^CSC_LINK=(.+)'
    if ($cscLinkMatch) {
        $cscVal = $cscLinkMatch.Matches.Groups[1].Value.Trim()
        if (-not [System.IO.Path]::IsPathRooted($cscVal)) {
            $env:CSC_LINK = Join-Path $PSScriptRoot $cscVal
        } else {
            $env:CSC_LINK = $cscVal
        }
    }

    # Cargar CSC_KEY_PASSWORD
    $cscPassMatch = Get-Content $envFile | Select-String '^CSC_KEY_PASSWORD=(.+)'
    if ($cscPassMatch) {
        $env:CSC_KEY_PASSWORD = $cscPassMatch.Matches.Groups[1].Value.Trim()
    }
}

# Fallback: si no se definió CSC_LINK en .env.local pero existe el .pfx en certs/
if (-not $env:CSC_LINK) {
    $defaultPfx = Join-Path $PSScriptRoot "certs\ServitecaPOS.pfx"
    if (Test-Path $defaultPfx) {
        $env:CSC_LINK = $defaultPfx
    }
}

# La contraseña del .pfx nunca se hardcodea: debe venir de CSC_KEY_PASSWORD en
# apps/desktop/.env.local (o de una variable de entorno). Sin ella no se puede firmar.
if ($env:CSC_LINK -and -not $env:CSC_KEY_PASSWORD) {
    Write-Host "CSC_LINK definido pero falta CSC_KEY_PASSWORD." -ForegroundColor Yellow
    Write-Host "Agrega CSC_KEY_PASSWORD=<contraseña-del-pfx> en apps/desktop/.env.local para firmar." -ForegroundColor Yellow
}

Write-Host "Iniciando publicación con electron-builder..." -ForegroundColor Cyan
if ($env:CSC_LINK) {
    Write-Host "Firma de código activa: $env:CSC_LINK" -ForegroundColor Green
} else {
    Write-Host "Sin certificado de firma de código configurado." -ForegroundColor Yellow
}

Set-Location "$PSScriptRoot"
npx electron-builder --win --publish always
