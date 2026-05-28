"""CloudWatch Embedded Metric Format (EMF) — zero-dependency custom metrics.

Usage:
    from src.metrics import emit

    emit("DocsUploaded", 1, dimensions={"UserId": user_id})
    emit("AIResponseTime", 1234, unit="Milliseconds")
"""
import json
import logging
import time

NAMESPACE = "StudyBot"
logger = logging.getLogger("studybot.metrics")


def emit(metric_name: str, value: float, unit: str = "Count", dimensions: dict | None = None):
    """Emit a single metric via EMF structured log."""
    dims = dimensions or {}
    payload = {
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [
                {
                    "Namespace": NAMESPACE,
                    "Dimensions": [list(dims.keys())] if dims else [[]],
                    "Metrics": [{"Name": metric_name, "Unit": unit}],
                }
            ],
        },
        metric_name: value,
        **dims,
    }
    # Lambda runtime captures print() to CloudWatch Logs
    print(json.dumps(payload))


def emit_multi(metrics: list[dict], dimensions: dict | None = None):
    """Emit multiple metrics in a single EMF log line."""
    dims = dimensions or {}
    metric_defs = [{"Name": m["Name"], "Unit": m.get("Unit", "Count")} for m in metrics]
    payload = {
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [
                {
                    "Namespace": NAMESPACE,
                    "Dimensions": [list(dims.keys())] if dims else [[]],
                    "Metrics": metric_defs,
                }
            ],
        },
        **dims,
    }
    for m in metrics:
        payload[m["Name"]] = m["Value"]
    print(json.dumps(payload))
