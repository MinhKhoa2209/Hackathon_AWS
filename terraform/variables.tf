variable "project_name" {
  description = "Project name used for resource names."
  type        = string
  default     = "studybot"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_profile" {
  description = "AWS CLI profile used by Terraform. Leave empty to use the default credential chain."
  type        = string
  default     = ""
}

variable "budget_limit_usd" {
  description = "Monthly budget limit in USD."
  type        = number
  default     = 80
}

variable "budget_alert_email" {
  description = "Email address for budget alerts. Leave empty to skip subscriber creation."
  type        = string
  default     = ""
}

variable "lambda_package_path" {
  description = "Path to the packaged StudyBot Lambda zip."
  type        = string
  default     = "../W7/starter_apps/studybot/_build/studybot-lambda.zip"
}

variable "cors_allow_origins" {
  description = "Allowed browser origins for API Gateway CORS."
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:8000"]
}

variable "ai_model_id" {
  description = "Bedrock model ID used by the backend."
  type        = string
  default     = "anthropic.claude-3-5-haiku-20241022-v1:0"
}

variable "embedding_model_arn" {
  description = "Embedding model ARN for Bedrock Knowledge Base."
  type        = string
  default     = "arn:aws:bedrock:ap-southeast-1::foundation-model/amazon.titan-embed-text-v2:0"
}
