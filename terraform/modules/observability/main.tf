resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = "${var.name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Lambda health + API Gateway traffic
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "Lambda — Invocations, Errors & Throttles"
          stat    = "Sum"
          period  = 60
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_name, { color = "#7c3aed" }],
            [".", "Errors", ".", ".", { color = "#ef4444" }],
            [".", "Throttles", ".", ".", { color = "#f59e0b" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "HTTP API — Requests & Errors"
          stat    = "Sum"
          period  = 60
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { color = "#06b6d4" }],
            [".", "5xx", ".", ".", { color = "#ef4444" }],
            [".", "4xx", ".", ".", { color = "#f59e0b" }],
          ]
        }
      },

      # Row 2: Lambda duration + DynamoDB
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "Lambda — Duration (ms)"
          period  = 60
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_name, { stat = "Average", color = "#7c3aed", label = "Avg" }],
            ["...", { stat = "p99", color = "#ef4444", label = "P99" }],
            ["...", { stat = "Maximum", color = "#f59e0b", label = "Max" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "DynamoDB — Capacity & Throttles"
          stat    = "Sum"
          period  = 60
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.dynamodb_table_name, { color = "#06b6d4", label = "Read CU" }],
            [".", "ConsumedWriteCapacityUnits", ".", ".", { color = "#7c3aed", label = "Write CU" }],
            [".", "ReadThrottleEvents", ".", ".", { color = "#ef4444", label = "Read Throttle" }],
            [".", "WriteThrottleEvents", ".", ".", { color = "#f59e0b", label = "Write Throttle" }],
          ]
        }
      },

      # Row 3: Lambda concurrency + Bedrock AI
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "Lambda — Concurrent Executions"
          period  = 60
          metrics = [
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", var.lambda_name, { stat = "Maximum", color = "#7c3aed", label = "Concurrent" }],
            ["AWS/Lambda", "UnreservedConcurrentExecutions", { stat = "Maximum", color = "#ef4444", label = "Unreserved (account)" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "Bedrock — Invocations & Latency"
          period  = 60
          metrics = [
            ["AWS/Bedrock", "Invocations", "ModelId", var.ai_model_id, { stat = "Sum", color = "#7c3aed", label = "Invocations" }],
            [".", "InvocationLatency", ".", ".", { stat = "Average", color = "#06b6d4", label = "Latency (ms)", yAxis = "right" }],
          ]
          yAxis = {
            right = { label = "ms" }
            left  = { label = "Count" }
          }
        }
      },

      # Row 4: Custom business metrics
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "StudyBot — User Activity"
          stat    = "Sum"
          period  = 300
          metrics = [
            ["StudyBot", "DocsUploaded", "UserId", "test-user-001", { color = "#10b981", label = "Uploads" }],
            ["StudyBot", "DocsDeleted", "UserId", "test-user-001", { color = "#ef4444", label = "Deletes" }],
            ["StudyBot", "QuestionsAsked", "UserId", "test-user-001", { color = "#7c3aed", label = "Questions" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 18
        width  = 12
        height = 6
        properties = {
          region  = var.aws_region
          title   = "StudyBot — Content Generated"
          stat    = "Sum"
          period  = 300
          metrics = [
            ["StudyBot", "CardsGenerated", "UserId", "test-user-001", { color = "#7c3aed", label = "Cards" }],
            ["StudyBot", "QuizGenerated", "UserId", "test-user-001", { color = "#06b6d4", label = "Quiz Questions" }],
            ["StudyBot", "UploadSizeBytes", "UserId", "test-user-001", { stat = "Sum", color = "#f59e0b", label = "Upload Bytes", yAxis = "right" }],
          ]
          yAxis = {
            right = { label = "Bytes" }
            left  = { label = "Count" }
          }
        }
      },
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.name}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${var.name}-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.name}-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }
}
