output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "docs_bucket_name" {
  value = aws_s3_bucket.docs.bucket
}

output "docs_bucket_arn" {
  value = aws_s3_bucket.docs.arn
}

