# Quick smoke check for local admin API
$base = if ($env:ADMIN_API_URL) { $env:ADMIN_API_URL } else { "http://127.0.0.1:3099" }
Write-Host "GET $base/health"
try {
  $res = Invoke-RestMethod -Uri "$base/health" -Method Get
  if ($res.ok -ne $true) {
    Write-Error "Health ok=false"
    exit 1
  }
  Write-Host "OK version=$($res.version) recentLoginMinutes=$($res.recentLoginMinutes)"
  exit 0
} catch {
  Write-Error $_
  exit 1
}
