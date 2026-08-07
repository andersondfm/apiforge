#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host 'Stopping ApiForge MySQL...' -ForegroundColor Cyan
docker compose down

Write-Host 'Stopped. Data volume kept (apiforge_mysql_data).' -ForegroundColor Green
Write-Host 'To wipe data too: docker compose down -v' -ForegroundColor DarkGray
