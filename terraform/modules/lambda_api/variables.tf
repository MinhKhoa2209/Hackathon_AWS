variable "name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "lambda_package_path" {
  type = string
}

variable "docs_bucket_name" {
  type = string
}

variable "docs_bucket_arn" {
  type = string
}

variable "userstore_table_name" {
  type = string
}

variable "userstore_table_arn" {
  type = string
}

variable "bedrock_kb_id" {
  type = string
}

variable "bedrock_data_source_id" {
  type = string
}

variable "ai_model_id" {
  type = string
}

variable "lambda_security_group_ids" {
  type    = list(string)
  default = []
}

variable "lambda_subnet_ids" {
  type    = list(string)
  default = []
}

variable "cors_allow_origins" {
  type = list(string)
}
