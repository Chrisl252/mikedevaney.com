$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (Test-Path dist) { Remove-Item -Recurse -Force dist }
New-Item -ItemType Directory dist | Out-Null
Copy-Item *.html dist\
Copy-Item sitemap.xml dist\
Copy-Item robots.txt dist\
Copy-Item manifest.json dist\
if (Test-Path llms.txt) { Copy-Item llms.txt dist\ }
Copy-Item -Recurse assets dist\assets

npx wrangler deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Deployed: https://mike-devaney.com"
