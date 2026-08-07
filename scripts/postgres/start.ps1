#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host 'Starting ApiForge PostgreSQL (Docker)...' -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Failed to start. Is Docker Desktop running?' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Waiting for PostgreSQL to become healthy...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(2)
do {
  $status = docker inspect --format='{{.State.Health.Status}}' apiforge-postgres 2>$null
  if ($status -eq 'healthy') { break }
  Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)

if ($status -ne 'healthy') {
  Write-Host "PostgreSQL is still starting (status: $status). Check: docker logs apiforge-postgres" -ForegroundColor Yellow
} else {
  Write-Host 'PostgreSQL is healthy.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Connection (ApiForge wizard):' -ForegroundColor Cyan
Write-Host '  Engine:   PostgreSQL'
Write-Host '  Host:     localhost'
Write-Host '  Port:     5432'
Write-Host '  Database: demo'
Write-Host '  Username: demo'
Write-Host '  Password: demo'
Write-Host ''
Write-Host 'Stop with:  .\stop.ps1' -ForegroundColor DarkGray
Write-Host 'Logs with:  docker logs -f apiforge-postgres' -ForegroundColor DarkGray
