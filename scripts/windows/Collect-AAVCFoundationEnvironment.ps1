param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $root = Join-Path (Get-Location) ".aavc-foundation-test\results"
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  $OutputPath = Join-Path $root "windows-environment.json"
}

function Get-InstalledAppMatches {
  param([string]$Pattern)
  $paths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  $items = foreach ($path in $paths) {
    Get-ItemProperty $path -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -and $_.DisplayName -match $Pattern } |
      Select-Object DisplayName, DisplayVersion, InstallLocation, Publisher
  }
  @($items | Sort-Object DisplayName, DisplayVersion -Unique)
}

$os = Get-CimInstance Win32_OperatingSystem
$computer = Get-CimInstance Win32_ComputerSystem

$result = [ordered]@{
  schema = 1
  collectedAt = (Get-Date).ToString("o")
  powershell = $PSVersionTable.PSVersion.ToString()
  windows = [ordered]@{
    caption = $os.Caption
    version = $os.Version
    buildNumber = $os.BuildNumber
    architecture = $os.OSArchitecture
  }
  computer = [ordered]@{
    manufacturer = $computer.Manufacturer
    model = $computer.Model
    totalPhysicalMemoryBytes = [int64]$computer.TotalPhysicalMemory
  }
  premiere = @(Get-InstalledAppMatches "Adobe Premiere Pro")
  uxpDeveloperTool = @(Get-InstalledAppMatches "UXP Developer Tool")
  creativeCloud = @(Get-InstalledAppMatches "Creative Cloud")
  node = try { (& node --version 2>$null) } catch { $null }
  npm = try { (& npm --version 2>$null) } catch { $null }
  git = try { (& git --version 2>$null) } catch { $null }
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $OutputPath
Write-Host "Environment report saved: $OutputPath" -ForegroundColor Green
