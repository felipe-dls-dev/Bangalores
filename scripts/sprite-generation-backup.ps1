# PowerShell script to backup existing battle sprite assets
# Save as scripts\sprite-generation-backup.ps1
# Usage: powershell -ExecutionPolicy Bypass -File sprite-generation-backup.ps1

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$source = Resolve-Path "..\public\assets\battle\sprites"
$dest = Join-Path (Split-Path $source) "sprites_backup_$timestamp"

Write-Host "Backing up sprite assets..."
Copy-Item -Path $source -Destination $dest -Recurse -Force
Write-Host "Backup completed at $dest"

