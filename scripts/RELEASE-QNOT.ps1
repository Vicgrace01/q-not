[CmdletBinding()]
param(
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

function Run-Step([string]$Label, [string]$Command, [string[]]$Arguments) {
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE. No commit was created."
    }
}

$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json')) -or -not (Test-Path (Join-Path $root '.git'))) {
    throw 'Run this script from the Q-not repository root.'
}

$branch = (& git branch --show-current).Trim()
if ($branch -ne 'main') {
    throw "Current branch is '$branch'. This release script expects 'main'. Switch to main and retry."
}

$origin = (& git remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0 -or $origin -notmatch 'github\.com[:/]Vicgrace01/q-not(?:\.git)?$') {
    throw "The origin remote is not the expected GitHub repository. Current origin: $origin"
}

Write-Host 'Checking GitHub branch state...' -ForegroundColor Cyan
Run-Step 'Fetch origin' 'git' @('fetch', 'origin')
$countText = (& git rev-list --left-right --count origin/main...HEAD).Trim()
$counts = $countText -split '\s+'
if ($counts.Count -ne 2) { throw "Could not read origin/main comparison: $countText" }
$behind = [int]$counts[0]
$ahead = [int]$counts[1]
if ($behind -gt 0) {
    throw "Local main is behind origin/main by $behind commit(s). Reconcile with GitHub first; this script will not force-push."
}
Write-Host "Local main is $ahead commit(s) ahead and $behind behind origin/main." -ForegroundColor Green

# Guard against accidentally deploying the stale Next.js starter page.
$homePagePath = Join-Path $root 'src/app/page.tsx'
if (-not (Test-Path -LiteralPath $homePagePath)) {
    throw 'src/app/page.tsx is missing. Refusing to release an incomplete app.'
}
$homePage = Get-Content -LiteralPath $homePagePath -Raw
if ($homePage -match 'next\.svg|Create Next App|To get started, edit the') {
    throw 'The homepage still appears to be the Next.js starter page. Replace it with the Q-not homepage before pushing.'
}
foreach ($requiredPath in @(
    'src/app/api/health/route.ts',
    'src/app/(auth)/login/page.tsx',
    'src/app/(auth)/signup/page.tsx',
    'src/app/(commuter)/c/login/page.tsx',
    'src/app/trips/page.tsx',
    'src/components/qnot-experience.tsx'
)) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $requiredPath))) {
        throw "Required Q-not file is missing: $requiredPath"
    }
}
Write-Host 'Q-not homepage and key app routes are present; Next.js starter guard passed.' -ForegroundColor Green

# Refuse to proceed if local secrets are tracked or not ignored.
$tracked = @(& git ls-files)
foreach ($envFile in @('.env.local', '.env.test')) {
    if (Test-Path -LiteralPath (Join-Path $root $envFile)) {
        if ($tracked -contains $envFile) {
            throw "$envFile is already tracked by Git. Remove it from the index before pushing."
        }
        & git check-ignore -q $envFile
        if ($LASTEXITCODE -ne 0) {
            throw "$envFile is not ignored by Git. Fix .gitignore before pushing."
        }
        Write-Host "$envFile is ignored and untracked." -ForegroundColor Green
    }
}
$trackedEnv = $tracked | Where-Object { $_ -match '(^|/)\.env(\.local|\.test)?$' }
if ($trackedEnv) {
    throw "Tracked environment files found: $($trackedEnv -join ', ')"
}

# Run the full local release gates.
Run-Step 'ESLint' 'pnpm' @('lint')
Run-Step 'Prisma schema validation' 'pnpm' @('exec', 'prisma', 'validate')
Run-Step 'TypeScript' 'pnpm' @('exec', 'tsc', '--noEmit')
Run-Step 'Automated tests' 'pnpm' @('test')
Run-Step 'Production build' 'pnpm' @('build')
Run-Step 'Git whitespace check' 'git' @('diff', '--check')

if (-not $Push) {
    Write-Host "`nValidation completed. No files were staged or pushed." -ForegroundColor Green
    Write-Host 'Inspect `git status --short`, then rerun this script with -Push to commit and push.' -ForegroundColor Yellow
    exit 0
}

Run-Step 'Stage project changes' 'git' @('add', '-A')
$staged = @(& git diff --cached --name-only)
if (-not $staged -or $staged.Count -eq 0) {
    throw 'There are no staged changes to commit.'
}
$blocked = $staged | Where-Object { $_ -match '(^|/)\.env$|(^|/)\.env\.local$|(^|/)\.env\.test$|(^|/)\.env\.[^/]+\.local$' }
if ($blocked) {
    & git reset -- $blocked | Out-Null
    throw "Secret environment file(s) were staged and have been unstaged: $($blocked -join ', ')"
}

Write-Host "`nFiles staged for release:" -ForegroundColor Cyan
$staged | ForEach-Object { Write-Host "  $_" }

Run-Step 'Staged diff check' 'git' @('diff', '--cached', '--check')
$answer = Read-Host "Type PUSH to create a commit and push these $($staged.Count) file(s) to origin/main"
if ($answer -cne 'PUSH') {
    Write-Host 'Cancelled. Changes remain staged locally; nothing was pushed.' -ForegroundColor Yellow
    exit 0
}

Run-Step 'Commit' 'git' @('commit', '-m', 'Prepare Q-not hackathon demo release')
Run-Step 'Push main to GitHub' 'git' @('push', '-u', 'origin', 'main')
Write-Host "`nQ-not release commit pushed to GitHub." -ForegroundColor Green
