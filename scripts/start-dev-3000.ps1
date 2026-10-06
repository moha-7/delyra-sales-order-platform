$ErrorActionPreference = "Stop"
$NodeDir = "C:\nvm4w\nodejs"
$env:Path = "$NodeDir;$env:APPDATA\npm;$env:Path"

Write-Host "Checking ports 3000 and 3001..." -ForegroundColor Cyan
$ports = @(3000, 3001)
foreach ($port in $ports) {
  $lines = cmd /c "netstat -ano | findstr :$port" 2>$null
  foreach ($line in $lines) {
    $parts = ($line -split '\s+') | Where-Object { $_ }
    $pid = $parts[-1]
    if ($pid -match '^\d+$') {
      try {
        Write-Host "Stopping process $pid on port $port" -ForegroundColor Yellow
        taskkill /PID $pid /F | Out-Null
      } catch {}
    }
  }
}

Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
npm run dev -- -p 3000
