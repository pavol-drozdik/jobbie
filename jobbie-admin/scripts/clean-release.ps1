# Stops local JOBBIE Admin / project Electron processes and removes build output folders (best-effort).
# Run from repo root: npm run clean:release
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Stop-JobbieAdminProcesses {
  $names = @('JOBBIE Admin')
  foreach ($name in $names) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
      Write-Host "Stopping $($_.ProcessName) (PID $($_.Id))"
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
  }
  Get-Process -Name 'electron' -ErrorAction SilentlyContinue | ForEach-Object {
    $path = $_.Path
    if ($path -and ($path -like "*jobbie-admin*" -or $path -like "*\release\*" -or $path -like "*\release-fresh\*" -or $path -like "*\release-build-*")) {
      Write-Host "Stopping electron PID $($_.Id) $path"
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

function Write-LockHints {
  param([string]$Dir)
  $asar = Get-ChildItem -LiteralPath $Dir -Filter 'app.asar' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $asar) { return }
  Write-Host "Debug: suspected lock on $($asar.FullName)"
  foreach ($name in @('Cursor','Code','electron','JOBBIE Admin','explorer')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
      Write-Host "  process may hold handles: $($_.ProcessName) (PID $($_.Id))"
    }
  }
}

function Remove-DirWithRetry {
  param([string]$Dir, [int]$Attempts = 8, [int]$DelayMs = 400)
  if (-not (Test-Path -LiteralPath $Dir)) { return $true }
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      Remove-Item -LiteralPath $Dir -Recurse -Force -ErrorAction Stop
      if (-not (Test-Path -LiteralPath $Dir)) {
        Write-Host "Removed $Dir"
        return $true
      }
    } catch {
      Write-Host ('Attempt ' + $i + '/' + $Attempts + ': could not remove ' + $Dir + ' - ' + $_.Exception.Message)
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  return -not (Test-Path -LiteralPath $Dir)
}

Stop-JobbieAdminProcesses
Start-Sleep -Milliseconds 300

$dirs = @((Join-Path $Root 'release-fresh'), (Join-Path $Root 'release'))
$dirs += @(Get-ChildItem -LiteralPath $Root -Directory -Filter 'release-build-*' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })

$anyFailed = $false
foreach ($d in $dirs) {
  if (-not $d) { continue }
  if (-not (Test-Path -LiteralPath $d)) { continue }
  if (-not (Remove-DirWithRetry -Dir $d)) {
    $anyFailed = $true
    Write-Host ""
    Write-Host "WARN: Could not remove $d (optional; npm run build:win uses a new release-build-* folder)."
    Write-LockHints -Dir $d
  }
}

if ($anyFailed) {
  Write-Host ""
  Write-Host "clean:release finished with warnings. Windows builds do not require deleting locked folders."
  Write-Host "Optional: close Cursor tabs under release/, quit JOBBIE Admin, then retry clean or delete folders manually."
}

exit 0
