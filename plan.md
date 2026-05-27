# StudyBot Terraform Deployment Plan

## Architecture

StudyBot will be deployed with a CLI-first AWS workflow using local Terraform state and the default AWS credential chain in `ap-southeast-1`. If you prefer a named profile, set `aws_profile` in `terraform/terraform.tfvars`.

- Frontend: Vite React build artifacts in S3, delivered through CloudFront with Origin Access Control.
- Auth: IAM-only baseline for the hackathon: least-privilege execution roles and resource policies. No Cognito signup/login/password reset flow.
- API: API Gateway HTTP API routes all backend requests to a Lambda function running FastAPI through Mangum.
- Documents: S3 bucket stores uploaded source documents.
- User state: DynamoDB single-table design for document metadata, recent queries, flashcards, and quiz records.
- RAG: Bedrock Knowledge Base backed by S3 Vectors, with S3 as the source document data source.
- Network: VPC, private subnets, Lambda security group, and gateway VPC endpoint for S3.
- Observability: CloudWatch log groups, dashboard, and basic Lambda/API alarms.
- Cost guardrail: AWS Budget monthly limit, default `$80`.

## Terraform Module Layout

- `network`: VPC, private subnets, route tables, Lambda security group, and S3 VPC endpoint.
- `storage`: S3 buckets for frontend assets and source documents.
- `frontend`: CloudFront distribution, Origin Access Control, and bucket policy.
- `database`: DynamoDB table for StudyBot user state.
- `lambda_api`: Lambda IAM role, function, API Gateway HTTP API, routes, and permissions.
- `bedrock_kb`: S3 Vectors bucket/index, Bedrock Knowledge Base role, KB, and S3 data source.
- `observability`: CloudWatch dashboard and alarms.
- `budget`: AWS monthly cost budget.

## CLI Workflow

1. Configure credentials once:

   ```powershell
   aws configure
   aws sts get-caller-identity
   ```

2. Build and package the backend:

   ```powershell
   cd W7\starter_apps\studybot
   .\scripts\package_lambda.ps1
   ```

3. Build the frontend:

   ```powershell
   cd W7\starter_apps\studybot\frontend
   npm install
   npm run build
   ```

4. Provision infrastructure:

   ```powershell
   cd D:\AWS\w7-xbrain\terraform
   terraform init
   terraform fmt -recursive
   terraform validate
   terraform plan -var-file=terraform.tfvars
   terraform apply -var-file=terraform.tfvars
   ```

5. Publish frontend after apply:

   ```powershell
   aws s3 sync ..\W7\starter_apps\studybot\frontend\dist s3://<frontend-bucket> --delete
   aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
   ```

## Acceptance Checklist

- `aws sts get-caller-identity` returns the expected account.
- `terraform fmt -recursive`, `terraform validate`, and `terraform plan` pass.
- Lambda package exists at `W7/starter_apps/studybot/_build/studybot-lambda.zip`.
- Frontend build exists at `W7/starter_apps/studybot/frontend/dist`.
- CloudFront URL loads the React app.
- Identity baseline is IAM-only: Lambda execution role has scoped S3, DynamoDB, Bedrock, and CloudWatch permissions.
- Public demo API works without user signup/login, using a fixed `X-User-Id` fallback for hackathon speed.
- Upload stores source documents in S3 and metadata in DynamoDB.
- Question answering uses Bedrock/Knowledge Base retrieval, not the local stub.
- Flashcards and quiz data persist in DynamoDB.
- CloudWatch logs, dashboard, and alarms show traffic/errors.
- Monthly budget alert is active.

## Teardown Checklist

1. Empty frontend and document S3 buckets.
2. Disable or delete Bedrock Knowledge Base data source sync jobs if any are running.
3. Run `terraform destroy -var-file=terraform.tfvars` from `terraform/`.
4. Verify CloudFront, API Gateway, Lambda, DynamoDB, S3/S3 Vectors, CloudWatch alarms, and budget are removed.
5. Remove local build artifacts only if no longer needed:

   ```powershell
   Remove-Item -Recurse -Force W7\starter_apps\studybot\_build
   Remove-Item -Recurse -Force W7\starter_apps\studybot\frontend\dist
   ```
