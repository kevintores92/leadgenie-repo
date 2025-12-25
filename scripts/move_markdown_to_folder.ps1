param(
  [string]$DestRoot = "ALL_MARKDOWN",
  [switch]$PreserveStructure = $true
)

Write-Host "Moving .md files into folder: $DestRoot (preserve structure: $PreserveStructure)"

$root = (Get-Location).Path

# Ensure destination exists
New-Item -Path $DestRoot -ItemType Directory -Force | Out-Null

# Find markdown files excluding the destination folder and .git
Get-ChildItem -Path $root -Recurse -File -Filter *.md | Where-Object {
  ($_.FullName -notlike "*$DestRoot*") -and ($_.FullName -notlike "*\\.git\\*")
} | ForEach-Object {
  $src = $_.FullName
  if ($PreserveStructure) {
    $rel = $src.Substring($root.Length+1)
    $destPath = Join-Path $DestRoot $rel
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -Path $destDir -ItemType Directory -Force | Out-Null }
    if (Test-Path $destPath) {
      $stamp = Get-Date -Format yyyyMMddHHmmss
      $base = [System.IO.Path]::GetFileNameWithoutExtension($destPath)
      $ext = [System.IO.Path]::GetExtension($destPath)
      $destPath = Join-Path $destDir ("${base}_$stamp$ext")
    }
    Move-Item -Path $src -Destination $destPath -Force
    Write-Host "Moved: $src -> $destPath"
  } else {
    $fileName = $_.Name
    $destPath = Join-Path $DestRoot $fileName
    if (Test-Path $destPath) {
      $stamp = Get-Date -Format yyyyMMddHHmmss
      $base = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
      $ext = [System.IO.Path]::GetExtension($fileName)
      $destPath = Join-Path $DestRoot ("${base}_$stamp$ext")
    }
    Move-Item -Path $src -Destination $destPath -Force
    Write-Host "Moved: $src -> $destPath"
  }
}

Write-Host "Move complete."
