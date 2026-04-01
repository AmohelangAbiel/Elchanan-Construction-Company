param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

if (-not (Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

Write-Host "Restoring PostgreSQL backup from $BackupPath ..."
pg_restore --clean --if-exists --no-owner --dbname="$DatabaseUrl" "$BackupPath"

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE."
}

Write-Host "Restore complete."

