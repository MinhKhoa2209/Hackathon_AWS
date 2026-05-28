from mangum import Mangum

from src.app import app
from src.adapters import factory
from src import handlers


_mangum = Mangum(app)


def handler(event, context):
    """Route between API Gateway events and S3 event notifications."""
    # S3 event notification
    if "Records" in event and event["Records"] and event["Records"][0].get("eventSource") == "aws:s3":
        storage = factory.make_storage()
        userstore = factory.make_userstore()
        vector_store = factory.make_vector()
        return handlers.handle_s3_event(event, storage, userstore, vector_store)

    # API Gateway (default)
    return _mangum(event, context)
