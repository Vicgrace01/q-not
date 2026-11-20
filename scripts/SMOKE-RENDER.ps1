[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$ErrorActionPreference = 'Continue'
$base = $BaseUrl.TrimEnd('/')
$paths = @('/', '/api/health', '/trips', '/login', '/signup', '/c/login', '/operator', '/driver')
$failed = @()

Write-Host "Checking Q-not at $base" -ForegroundColor Cyan
foreach ($path in $paths) {
    $uri = "$base$path"
    try {
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
        $status = [int]$response.StatusCode
        if ($status -ge 200 -and $status -lt 400) {
            Write-Host ("PASS  {0,-22} HTTP {1}" -f $path, $status) -ForegroundColor Green
        }
        else {
            Write-Host ("FAIL  {0,-22} HTTP {1}" -f $path, $status) -ForegroundColor Red
            $failed += $path
        }
    }
    catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        $detail = if ($status) { "HTTP $status" } else { $_.Exception.Message }
        Write-Host ("FAIL  {0,-22} {1}" -f $path, $detail) -ForegroundColor Red
        $failed += $path
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`nSmoke check failed for: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll public routes responded. This does not verify login, permissions or payment correctness." -ForegroundColor Green
