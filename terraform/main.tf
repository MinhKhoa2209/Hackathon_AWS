locals {
  name = "${var.project_name}-${var.environment}"
  ai_model_arn = startswith(var.ai_model_id, "us.") || startswith(var.ai_model_id, "global.") ? (
    "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.ai_model_id}"
    ) : (
    "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.ai_model_id}"
  )
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

data "aws_caller_identity" "current" {}

module "network" {
  source = "./modules/network"

  name       = local.name
  aws_region = var.aws_region
}

module "storage" {
  source = "./modules/storage"

  name = local.name
}

module "database" {
  source = "./modules/database"

  name = local.name
}

module "bedrock_kb" {
  source = "./modules/bedrock_kb"

  name                 = local.name
  docs_bucket_arn      = module.storage.docs_bucket_arn
  embedding_model_arn  = var.embedding_model_arn
  generation_model_arn = local.ai_model_arn
}

module "lambda_api" {
  source = "./modules/lambda_api"

  name                      = local.name
  aws_region                = var.aws_region
  lambda_package_path       = var.lambda_package_path
  docs_bucket_name          = module.storage.docs_bucket_name
  docs_bucket_arn           = module.storage.docs_bucket_arn
  userstore_table_name      = module.database.table_name
  userstore_table_arn       = module.database.table_arn
  bedrock_kb_id             = module.bedrock_kb.knowledge_base_id
  bedrock_data_source_id    = module.bedrock_kb.data_source_id
  ai_model_id               = var.ai_model_id
  ai_model_arn              = local.ai_model_arn
  lambda_security_group_ids = [module.network.lambda_security_group_id]
  lambda_subnet_ids         = module.network.private_subnet_ids
  cors_allow_origins        = var.cors_allow_origins
}

module "frontend" {
  source = "./modules/frontend"

  name                 = local.name
  frontend_bucket_name = module.storage.frontend_bucket_name
  frontend_bucket_arn  = module.storage.frontend_bucket_arn
  api_base_url         = module.lambda_api.api_endpoint
  aws_region           = var.aws_region
  frontend_dist_path   = var.frontend_dist_path
}

module "observability" {
  source = "./modules/observability"

  name             = local.name
  aws_region       = var.aws_region
  lambda_name      = module.lambda_api.lambda_name
  api_gateway_name = module.lambda_api.api_name
}

module "budget" {
  source = "./modules/budget"

  name        = local.name
  limit_usd   = var.budget_limit_usd
  alert_email = var.budget_alert_email
}
