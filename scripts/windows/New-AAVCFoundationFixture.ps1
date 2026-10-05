param(
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path (Get-Location) ".aavc-foundation-test"
}

$AssetsDir = Join-Path $OutputRoot "assets"
$ResultsDir = Join-Path $OutputRoot "results"
$ExportsDir = Join-Path $OutputRoot "exports"

New-Item -ItemType Directory -Force -Path $AssetsDir, $ResultsDir, $ExportsDir | Out-Null

Add-Type -AssemblyName System.Drawing

function New-TestPng {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Label,
    [Parameter(Mandatory=$true)][System.Drawing.Color]$BackColor
  )

  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $graphics.Clear($BackColor)
    $font = New-Object System.Drawing.Font("Arial", 110, [System.Drawing.FontStyle]::Bold)
    $small = New-Object System.Drawing.Font("Arial", 38, [System.Drawing.FontStyle]::Regular)
    $brush = [System.Drawing.Brushes]::White
    $graphics.DrawString($Label, $font, $brush, 100, 390)
    $graphics.DrawString("AAVC PREMIERE FOUNDATION TEST FIXTURE", $small, $brush, 105, 560)
    $graphics.DrawString("1920x1080 PNG - DO NOT USE FOR PRODUCTION", $small, $brush, 105, 625)
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $font.Dispose()
    $small.Dispose()
  }
  finally {
    $graphics.Dispose()
    $bmp.Dispose()
  }
}

New-TestPng -Path (Join-Path $AssetsDir "A001.png") -Label "A001" -BackColor ([System.Drawing.Color]::FromArgb(32, 92, 171))
New-TestPng -Path (Join-Path $AssetsDir "A002.png") -Label "A002" -BackColor ([System.Drawing.Color]::FromArgb(29, 131, 72))
New-TestPng -Path (Join-Path $AssetsDir "A003.png") -Label "A003" -BackColor ([System.Drawing.Color]::FromArgb(145, 75, 24))

$fixtureInfo = [ordered]@{
  schema = 1
  createdAt = (Get-Date).ToString("o")
  purpose = "AI Automatic Video Composer Premiere - Foundation S01-S16"
  assets = @("A001.png", "A002.png", "A003.png")
  expectedResolution = "1920x1080"
  resultsFolder = $ResultsDir
  exportsFolder = $ExportsDir
}

$fixtureInfo | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $OutputRoot "fixture-info.json")

Write-Host ""
Write-Host "AAVC Foundation fixture READY" -ForegroundColor Green
Write-Host "Root    : $OutputRoot"
Write-Host "Assets  : $AssetsDir"
Write-Host "Results : $ResultsDir"
Write-Host "Exports : $ExportsDir"
Write-Host ""
Write-Host "Gunakan folder Assets saat S03 memilih Folder Aset."
Write-Host "Gunakan project Premiere TEST kosong untuk seluruh S01-S16."
