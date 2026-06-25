$token = (Get-Content "$PSScriptRoot\.env.local" | Select-String 'GH_TOKEN=(.+)').Matches.Groups[1].Value
$env:GH_TOKEN = $token
Set-Location "$PSScriptRoot"
npx electron-builder --win --publish always
