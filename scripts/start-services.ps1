# Start StudyBot services (run at 7:30 AM)
# Recreates VPC endpoints that were deleted overnight

Write-Host "=== Starting StudyBot services ===" -ForegroundColor Yellow

Set-Location "d:\AWS\w7-xbrain\terraform"

# Terraform will recreate the deleted VPC endpoints
Write-Host "Running terraform apply to restore VPC endpoints..."
terraform apply -auto-approve 2>&1 | Select-String "Apply complete|Error|to add"

Write-Host ""
Write-Host "=== Services restored ===" -ForegroundColor Green
Write-Host "Testing health endpoint..."

Start-Sleep 5
try {
    $resp = Invoke-WebRequest -Uri "https://pyzr1w8hi2.execute-api.us-east-1.amazonaws.com/health" -UseBasicParsing -TimeoutSec 15
    Write-Host "Health: $($resp.Content)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed (Lambda cold start may need 10-15s): $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Try again in 30 seconds."
}

Write-Host ""
Write-Host "Live URL: https://d2ejfy6ejo0y9l.cloudfront.net"
