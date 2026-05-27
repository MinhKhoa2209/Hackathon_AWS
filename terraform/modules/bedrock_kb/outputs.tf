output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.this.id
}

output "data_source_id" {
  value = aws_bedrockagent_data_source.docs.data_source_id
}

output "vector_bucket_arn" {
  value = aws_s3vectors_vector_bucket.this.vector_bucket_arn
}

output "vector_index_arn" {
  value = aws_s3vectors_index.this.index_arn
}
