# Stop StudyBot services to save cost (run at midnight)
# Only stops VPC endpoints (main cost driver ~$0.94/night)
# Lambda, API GW, DynamoDB, S3, CloudFront = $0 when idle (pay-per-use)

Write-Host "=== Stopping StudyBot services ===" -ForegroundColor Yellow

# Delete VPC Interface Endpoints (cost $0.013/hr each = $0.94/night for 3)
$endpoints = aws ec2 describe-vpc-endpoints --region us-east-1 --filters "Name=tag:Name,Values=*studybot*" "Name=vpc-endpoint-type,Values=Interface" --query "VpcEndpoints[*].VpcEndpointId" --output text 2>&1
if ($endpoints -and $endpoints -ne "None") {
    $ids = $endpoints -split "\s+"
    foreach ($id in $ids) {
        if ($id) {
            Write-Host "Deleting VPC endpoint: $id"
            aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $id --region us-east-1 2>&1 | Out-Null
        }
    }
    Write-Host "VPC endpoints deleted (saves ~$0.94 overnight)" -ForegroundColor Green
} else {
    Write-Host "No VPC endpoints found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Services stopped ===" -ForegroundColor Green
Write-Host "Note: Lambda, API GW, DynamoDB, S3, CloudFront cost $0 when idle."
Write-Host "Only VPC endpoints charge hourly. They are now deleted."
Write-Host ""
Write-Host "To restore tomorrow: .\scripts\start-services.ps1"
