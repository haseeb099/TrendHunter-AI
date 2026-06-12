# Sync .env values to GitHub Actions repository secrets (daily ingest + CI).
# Usage: powershell -File scripts/sync-github-secrets.ps1
# Requires: gh CLI authenticated as repo owner

param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile"
}

# Map .env keys -> GitHub secret names (workflow references)
$secretKeys = @(
  "DATABASE_URL",
  "JWT_SECRET",
  "APP_ID",
  "APP_URL",
  "SERPER_API_KEY",
  "SERPER_API_KEYS",
  "SERPAPI_KEY",
  "SEARCHAPI_KEY",
  "RAPIDAPI_KEY",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "EBAY_ENV",
  "CJ_API_KEY",
  "ALIEXPRESS_APP_KEY",
  "ALIEXPRESS_APP_SECRET",
  "META_ACCESS_TOKEN",
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "INGEST_SECRET"
)

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim()
  if ($val.StartsWith('"') -and $val.EndsWith('"')) {
    $val = $val.Substring(1, $val.Length - 2)
  }
  $envMap[$key] = $val
}

# Defaults for secrets not in .env
if (-not $envMap["APP_URL"]) { $envMap["APP_URL"] = "http://localhost:3000" }
if (-not $envMap["INGEST_SECRET"]) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $envMap["INGEST_SECRET"] = [Convert]::ToBase64String($bytes)
  Write-Host "Generated INGEST_SECRET (also add to .env for local HTTP ingest triggers)"
}
if (-not $envMap["RESEND_API_KEY"]) {
  $envMap["RESEND_API_KEY"] = "re_ci_placeholder_set_real_key_before_prod_deploy"
  Write-Host "Using placeholder RESEND_API_KEY - replace before production email deploy"
}

$set = 0
$skipped = 0
foreach ($key in $secretKeys) {
  $val = $envMap[$key]
  if ([string]::IsNullOrWhiteSpace($val)) {
    Write-Host "skip $key (empty)"
    $skipped++
    continue
  }
  $val | gh secret set $key --repo haseeb099/TrendHunter-AI
  if ($LASTEXITCODE -ne 0) { Write-Error "Failed to set $key" }
  Write-Host "set $key"
  $set++
}

Write-Host "Done: $set secrets set, $skipped skipped."
