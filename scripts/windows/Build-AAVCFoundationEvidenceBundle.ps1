param(
  [Parameter(Mandatory = $true)]
  [string]$ReportPath,

  [string]$ReviewPath = ".aavc-foundation-test\results\foundation-review.json",
  [string]$OutputRoot = ".aavc-foundation-test\evidence"
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath([string]$Value) {
  if ([System.IO.Path]::IsPathRooted($Value)) {
    return [System.IO.Path]::GetFullPath($Value)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Value))
}

$report = Resolve-RepoPath $ReportPath
$review = Resolve-RepoPath $ReviewPath
$outputRoot = Resolve-RepoPath $OutputRoot

if (-not (Test-Path -LiteralPath $report -PathType Leaf)) {
  throw "Foundation report tidak ditemukan: $report"
}

$reviewDir = Split-Path -Parent $review
New-Item -ItemType Directory -Force -Path $reviewDir | Out-Null

if (-not (Test-Path -LiteralPath $review -PathType Leaf)) {
  Write-Host "Review JSON belum ada. Menjalankan reviewer..."
  & node "scripts\review-foundation-report.mjs" $report "--out" $review
  $reviewExit = $LASTEXITCODE
  if ($reviewExit -eq 2) {
    throw "Reviewer gagal karena report/command invalid. Exit code: $reviewExit"
  }
  Write-Host "Reviewer selesai dengan exit code $reviewExit. Evidence tetap akan dibundel agar FAIL/NO-GO juga dapat diaudit."
}

if (-not (Test-Path -LiteralPath $review -PathType Leaf)) {
  throw "Review JSON tidak ditemukan setelah reviewer dijalankan: $review"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleName = "aavc-foundation-evidence-$stamp"
$bundleDir = Join-Path $outputRoot $bundleName
$zipPath = Join-Path $outputRoot "$bundleName.zip"

New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

$reportDest = Join-Path $bundleDir "foundation-report.json"
$reviewDest = Join-Path $bundleDir "foundation-review.json"
Copy-Item -LiteralPath $report -Destination $reportDest -Force
Copy-Item -LiteralPath $review -Destination $reviewDest -Force

$environmentCandidate = Get-ChildItem -Path (Resolve-RepoPath ".aavc-foundation-test") -Filter "windows-environment.json" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$environmentDest = $null
if ($environmentCandidate) {
  $environmentDest = Join-Path $bundleDir "windows-environment.json"
  Copy-Item -LiteralPath $environmentCandidate.FullName -Destination $environmentDest -Force
}

$files = @()
Get-ChildItem -LiteralPath $bundleDir -File | ForEach-Object {
  $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $files += [ordered]@{
    name = $_.Name
    bytes = $_.Length
    sha256 = $hash
  }
}

$reviewJson = Get-Content -LiteralPath $reviewDest -Raw | ConvertFrom-Json
$manifest = [ordered]@{
  schemaVersion = 1
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  product = "AI Automatic Video Composer Premiere"
  foundationBuild = "0.0.6"
  sourceReportOriginalPath = $report
  reviewDecision = $reviewJson.decision
  reportSha256 = $reviewJson.source.sha256
  gateMutationPerformed = $false
  note = "Evidence bundle only. GO_CANDIDATE is not GO_APPROVED; docs/foundation-gate.json must be reviewed and changed separately."
  files = $files
}

$manifestPath = Join-Path $bundleDir "EVIDENCE_MANIFEST.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$readmePath = Join-Path $bundleDir "README.txt"
@"
AAVC FOUNDATION EVIDENCE BUNDLE

Decision: $($reviewJson.decision)
Generated: $($manifest.generatedAt)
Foundation build: 0.0.6

Isi utama:
- foundation-report.json = report asli dari plugin
- foundation-review.json = hasil deterministic reviewer
- windows-environment.json = environment lokal bila tersedia
- EVIDENCE_MANIFEST.json = SHA-256 dan metadata bundle

PENTING:
Bundle ini TIDAK membuka Stage 02 secara otomatis.
GO_CANDIDATE tetap membutuhkan human/agent review dan commit terpisah untuk mengubah docs/foundation-gate.json menjadi GO_APPROVED.
"@ | Set-Content -LiteralPath $readmePath -Encoding UTF8

# Rebuild manifest once README exists so every evidence file is hashed.
$files = @()
Get-ChildItem -LiteralPath $bundleDir -File | Where-Object { $_.Name -ne "EVIDENCE_MANIFEST.json" } | ForEach-Object {
  $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $files += [ordered]@{
    name = $_.Name
    bytes = $_.Length
    sha256 = $hash
  }
}
$manifest.files = $files
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $bundleDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "Foundation evidence bundle selesai."
Write-Host "Decision : $($reviewJson.decision)"
Write-Host "Folder   : $bundleDir"
Write-Host "ZIP      : $zipPath"
Write-Host ""
Write-Host "ZIP ini siap disimpan/direview. Jangan mengubah foundation-gate.json hanya berdasarkan ZIP tanpa review eksplisit."
