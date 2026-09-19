#Requires -Version 5.1
<#
    idv-web 一鍵部署腳本

    包裝現有的單一 Cloudflare Worker 部署流程（frontend build + wrangler deploy）。
    採 fail-fast 設計：任一前置條件不滿足就中止，不自動執行登入、建立 D1、
    建立 production 資源、修改 Secret 或 API migration 等 provisioning 動作。
#>

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Failure {
    param([string]$Message, [string]$Hint)
    Write-Host ""
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    if ($Hint) {
        Write-Host "       建議處理方式：$Hint" -ForegroundColor Yellow
    }
}

function Fail-Deploy {
    param([string]$Stage, [string]$Message, [string]$Hint)
    Write-Failure -Message $Message -Hint $Hint
    Write-Host ""
    Write-Host "部署已中止於：$Stage" -ForegroundColor Red
    exit 1
}

Write-Step "Preflight 檢查：Node.js"
try {
    $nodeVersion = node -v 2>$null
} catch {
    $nodeVersion = $null
}
if (-not $nodeVersion) {
    Fail-Deploy -Stage "Preflight / Node.js" -Message "找不到可執行的 Node.js（node -v 失敗）。" -Hint "請先安裝 Node.js（建議 LTS 版本）並確認已加入 PATH。"
}
Write-Host "Node.js 版本：$nodeVersion"

Write-Step "Preflight 檢查：npm"
try {
    $npmVersion = npm -v 2>$null
} catch {
    $npmVersion = $null
}
if (-not $npmVersion) {
    Fail-Deploy -Stage "Preflight / npm" -Message "找不到可執行的 npm（npm -v 失敗）。" -Hint "npm 通常隨 Node.js 一併安裝，請確認 Node.js 安裝是否完整並已加入 PATH。"
}
Write-Host "npm 版本：$npmVersion"

Write-Step "Preflight 檢查：Wrangler"
try {
    $wranglerVersion = npx --yes wrangler --version 2>$null
} catch {
    $wranglerVersion = $null
}
if (-not $wranglerVersion) {
    Fail-Deploy -Stage "Preflight / Wrangler" -Message "無法執行 wrangler（npx wrangler --version 失敗）。" -Hint "請先在專案根目錄執行 npm install 以安裝 devDependencies（含 wrangler）。"
}
Write-Host "Wrangler 版本：$wranglerVersion"

Write-Step "Preflight 檢查：wrangler.jsonc"
$wranglerConfigPath = Join-Path $ProjectRoot 'wrangler.jsonc'
if (-not (Test-Path $wranglerConfigPath)) {
    Fail-Deploy -Stage "Preflight / wrangler.jsonc" -Message "找不到 $wranglerConfigPath。" -Hint "請確認在專案根目錄執行本腳本，且 wrangler.jsonc 未被移除。"
}
Write-Host "已找到 wrangler.jsonc：$wranglerConfigPath"

Write-Step "Preflight 檢查：Cloudflare 登入狀態"
try {
    $whoamiOutput = (npx --yes wrangler whoami 2>&1 | Out-String).Trim()
} catch {
    $whoamiOutput = ''
}
if ([string]::IsNullOrWhiteSpace($whoamiOutput) -or $whoamiOutput -match '(?i)not authenticated' -or $whoamiOutput -notmatch '(?i)logged in') {
    Fail-Deploy -Stage "Preflight / Cloudflare 登入" -Message "尚未登入 Cloudflare（npx wrangler whoami 未顯示已登入帳號）。" -Hint "請先執行 npx wrangler login 完成登入後再重新執行本腳本。"
}
Write-Host $whoamiOutput

Write-Step "Preflight 檢查：D1 database_id"
$wranglerConfigContent = Get-Content -Path $wranglerConfigPath -Raw
$databaseIdMatch = [regex]::Match($wranglerConfigContent, '"database_id"\s*:\s*"([^"]*)"')
$databaseId = if ($databaseIdMatch.Success) { $databaseIdMatch.Groups[1].Value } else { '' }
$isPlaceholderId = $false
if ([string]::IsNullOrWhiteSpace($databaseId)) {
    $isPlaceholderId = $true
} elseif ($databaseId -eq '00000000-0000-0000-0000-000000000000') {
    $isPlaceholderId = $true
} elseif ($databaseId -match '(?i)xxxx|example|your-database-id|placeholder|changeme') {
    $isPlaceholderId = $true
} elseif ($databaseId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    $isPlaceholderId = $true
}
if ($isPlaceholderId) {
    Fail-Deploy -Stage "Preflight / D1 database_id" -Message "wrangler.jsonc 的 database_id 仍為佔位值、空值或明顯範例值，尚未建立正式 D1 資源。" -Hint "請先執行 npx wrangler d1 create idv-web 建立正式 D1 資料庫，並把回傳的 database_id 貼回 wrangler.jsonc 後再重新執行本腳本。"
}
Write-Host "D1 database_id：$databaseId"

Write-Host ""
Write-Host "[OK] 全部 Preflight 檢查通過（Node.js / npm / Wrangler / Cloudflare 登入 / wrangler.jsonc / D1 database_id）。" -ForegroundColor Green

Write-Step "執行部署：npm run cf:deploy（frontend build + wrangler deploy）"
npm run cf:deploy
$deployExitCode = $LASTEXITCODE

if ($deployExitCode -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] 部署失敗：npm run cf:deploy 結束碼為 $deployExitCode。" -ForegroundColor Red
    Write-Host "       失敗可能發生於 frontend build 或 wrangler deploy 階段，請往上檢視輸出以定位問題。" -ForegroundColor Yellow
    exit $deployExitCode
}

Write-Host ""
Write-Host "[OK] 部署完成：frontend build 與 Cloudflare Worker 已透過 npm run cf:deploy 成功佈署。" -ForegroundColor Green
exit 0
