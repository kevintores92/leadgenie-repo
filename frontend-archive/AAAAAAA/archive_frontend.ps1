param(
  [string]$Source = "AI_LG",
  [string]$DestRoot = "frontend-archive",
  [string]$Stamp = (Get-Date -Format yyyyMMdd)
)

$dest = Join-Path -Path $DestRoot -ChildPath ("$Source-legacy-$Stamp")

Write-Host "Archiving frontend from '$Source' to '$dest'..."

if (-Not (Test-Path -Path $Source)) {
  Write-Error "Source folder '$Source' not found."
  exit 1
}

New-Item -Path $DestRoot -ItemType Directory -Force | Out-Null

# Move the source folder into the archive destination (removes original)
Move-Item -Path $Source -Destination $dest -Force

Write-Host "Archive complete (moved): $dest"
