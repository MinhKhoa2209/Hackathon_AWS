output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "lambda_name" {
  value = aws_lambda_function.api.function_name
}

output "api_name" {
  value = aws_apigatewayv2_api.http.name
}

output "api_id" {
  value = aws_apigatewayv2_api.http.id
}

