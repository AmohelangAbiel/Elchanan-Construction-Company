param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,
  [Parameter(Mandatory = $false)]
  [string]$OutputPath = ".\\backups\\elchanan-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
)

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

Write-Host "Creating PostgreSQL backup at $OutputPath ..."
pg_dump --format=custom --file="$OutputPath" "$DatabaseUrl"

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE."
}

Write-Host "Backup complete."

