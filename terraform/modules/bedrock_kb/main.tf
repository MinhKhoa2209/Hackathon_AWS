locals {
  vector_bucket_name = substr("${replace(var.name, "_", "-")}-vectors", 0, 63)
  vector_index_name  = "studybot-index"
}

resource "aws_s3vectors_vector_bucket" "this" {
  vector_bucket_name = local.vector_bucket_name
  force_destroy      = true
}

resource "aws_s3vectors_index" "this" {
  vector_bucket_name = aws_s3vectors_vector_bucket.this.vector_bucket_name
  index_name         = local.vector_index_name
  data_type          = "float32"
  dimension          = 1024
  distance_metric    = "cosine"

  metadata_configuration {
    non_filterable_metadata_keys = [
      "AMAZON_BEDROCK_TEXT",
      "AMAZON_BEDROCK_METADATA"
    ]
  }
}

data "aws_iam_policy_document" "bedrock_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "kb" {
  name               = "${var.name}-bedrock-kb-role"
  assume_role_policy = data.aws_iam_policy_document.bedrock_assume.json
}

data "aws_iam_policy_document" "kb" {
  statement {
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [var.docs_bucket_arn, "${var.docs_bucket_arn}/*"]
  }

  statement {
    actions = [
      "bedrock:GetInferenceProfile",
      "bedrock:InvokeModel",
      "bedrock:RetrieveAndGenerate"
    ]
    resources = [
      var.embedding_model_arn,
      var.generation_model_arn
    ]
  }

  statement {
    actions = [
      "s3vectors:GetIndex",
      "s3vectors:ListIndexes",
      "s3vectors:PutVectors",
      "s3vectors:GetVectors",
      "s3vectors:QueryVectors",
      "s3vectors:DeleteVectors"
    ]
    resources = [
      aws_s3vectors_vector_bucket.this.vector_bucket_arn,
      aws_s3vectors_index.this.index_arn
    ]
  }
}

resource "aws_iam_role_policy" "kb" {
  name   = "${var.name}-bedrock-kb"
  role   = aws_iam_role.kb.id
  policy = data.aws_iam_policy_document.kb.json
}

resource "aws_bedrockagent_knowledge_base" "this" {
  name     = "${var.name}-kb"
  role_arn = aws_iam_role.kb.arn

  knowledge_base_configuration {
    type = "VECTOR"

    vector_knowledge_base_configuration {
      embedding_model_arn = var.embedding_model_arn
    }
  }

  storage_configuration {
    type = "S3_VECTORS"

    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.this.index_arn
    }
  }

  depends_on = [aws_iam_role_policy.kb]
}

resource "aws_bedrockagent_data_source" "docs" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.this.id
  name              = "${var.name}-docs"

  data_source_configuration {
    type = "S3"

    s3_configuration {
      bucket_arn = var.docs_bucket_arn
    }
  }
}
