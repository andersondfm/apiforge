#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host 'Starting ApiForge SQL Server (Docker)...' -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Failed to start. Is Docker Desktop running?' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Waiting for SQL Server to become healthy...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(3)
do {
  $status = docker inspect --format='{{.State.Health.Status}}' apiforge-mssql 2>$null
  if ($status -eq 'healthy') { break }
  Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)

if ($status -ne 'healthy') {
  Write-Host "SQL Server is still starting (status: $status). Check: docker logs apiforge-mssql" -ForegroundColor Yellow
  exit 1
}

Write-Host 'Applying seed (demo DB / products / users)...' -ForegroundColor Cyan
docker exec apiforge-mssql /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P 'Your_strong_Password123' -i /init/01-seed.sql
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Seed failed.' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host 'SQL Server is healthy and seeded.' -ForegroundColor Green
Write-Host ''
Write-Host 'Connection (ApiForge wizard):' -ForegroundColor Cyan
Write-Host '  Engine:   SQL Server'
Write-Host '  Host:     localhost'
Write-Host '  Port:     1433'
Write-Host '  Database: demo'
Write-Host '  Username: sa'
Write-Host '  Password: Your_strong_Password123'
Write-Host ''
Write-Host 'Stop with:  .\stop.ps1' -ForegroundColor DarkGray
Write-Host 'Logs with:  docker logs -f apiforge-mssql' -ForegroundColor DarkGray
