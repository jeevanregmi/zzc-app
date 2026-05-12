Write-Host "`nCloudflare Pages — ZZC Secrets Setup" -ForegroundColor Green
Write-Host "======================================`n" -ForegroundColor Green

$project = "zeneration-z-chautari"

# AWS_ACCESS_KEY_ID
$keyId = Read-Host -Prompt "Enter AWS_ACCESS_KEY_ID" -AsSecureString
$keyIdPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyId)
)
$keyIdPlain | npx wrangler pages secret put AWS_ACCESS_KEY_ID --project-name=$project
Write-Host "AWS_ACCESS_KEY_ID set.`n" -ForegroundColor Cyan

# AWS_SECRET_ACCESS_KEY
$secret = Read-Host -Prompt "Enter AWS_SECRET_ACCESS_KEY" -AsSecureString
$secretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
)
$secretPlain | npx wrangler pages secret put AWS_SECRET_ACCESS_KEY --project-name=$project
Write-Host "AWS_SECRET_ACCESS_KEY set.`n" -ForegroundColor Cyan

# AWS_REGION (not sensitive, set directly)
"us-east-1" | npx wrangler pages secret put AWS_REGION --project-name=$project
Write-Host "AWS_REGION set to us-east-1.`n" -ForegroundColor Cyan

Write-Host "All 3 secrets configured. Ready to deploy!" -ForegroundColor Green
