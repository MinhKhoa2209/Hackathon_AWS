output "api_endpoint" {
  value = module.lambda_api.api_endpoint
}

output "cloudfront_url" {
  value = module.frontend.cloudfront_url
}

output "cloudfront_distribution_id" {
  value = module.frontend.distribution_id
}

output "frontend_bucket_name" {
  value = module.storage.frontend_bucket_name
}

output "docs_bucket_name" {
  value = module.storage.docs_bucket_name
}

output "bedrock_knowledge_base_id" {
  value = module.bedrock_kb.knowledge_base_id
}

output "bedrock_data_source_id" {
  value = module.bedrock_kb.data_source_id
}
