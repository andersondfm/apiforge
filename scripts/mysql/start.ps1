#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host 'Starting ApiForge MySQL (Docker)...' -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Failed to start. Is Docker Desktop running?' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Waiting for MySQL to become healthy...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(2)
do {
  $status = docker inspect --format='{{.State.Health.Status}}' apiforge-mysql 2>$null
  if ($status -eq 'healthy') { break }
  Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)

if ($status -ne 'healthy') {
  Write-Host "MySQL is still starting (status: $status). Check: docker logs apiforge-mysql" -ForegroundColor Yellow
} else {
  Write-Host 'MySQL is healthy.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Connection (ApiForge wizard):' -ForegroundColor Cyan
Write-Host '  Engine:   MySQL'
Write-Host '  Host:     localhost'
Write-Host '  Port:     3306'
Write-Host '  Database: demo'
Write-Host '  Username: demo'
Write-Host '  Password: demo'
Write-Host ''
Write-Host 'Stop with:  .\stop.ps1' -ForegroundColor DarkGray
Write-Host 'Logs with:  docker logs -f apiforge-mysql' -ForegroundColor DarkGray
