import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("AI_BACKEND", "local")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("USERSTORE_BACKEND", "sqlite")
os.environ.setdefault("VECTOR_BACKEND", "local")

_tmp = tempfile.mkdtemp(prefix="studybot-summary-dashboard-test-")
os.environ["STORAGE_LOCAL_DIR"] = str(Path(_tmp) / "uploads")
os.environ["USERSTORE_SQLITE_PATH"] = str(Path(_tmp) / "users.db")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from src.app import app


client = TestClient(app)


def test_summary_and_dashboard():
    user_id = "summary-student"
    content = (
        b"Gradient descent updates model parameters using a learning rate. "
        b"Overfitting happens when a model memorizes training data instead of generalizing. "
        b"Validation data helps measure whether the model performs well on unseen examples."
    )
    upload = client.post(
        "/upload",
        files={"file": ("ml-notes.txt", content, "text/plain")},
        headers={"X-User-Id": user_id},
    )
    assert upload.status_code == 200
    doc_id = upload.json()["doc_id"]

    summary = client.post(
        "/summary/generate",
        json={"doc_id": doc_id},
        headers={"X-User-Id": user_id},
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["doc_id"] == doc_id
    assert body["summary"]
    assert len(body["testable_concepts"]) == 5

    client.post(
        "/query",
        json={"question": "What is gradient descent?"},
        headers={"X-User-Id": user_id},
    )
    dashboard = client.get("/dashboard", headers={"X-User-Id": user_id})
    assert dashboard.status_code == 200
    dash = dashboard.json()
    assert len(dash["activity"]) == 7
    assert dash["studied_count"] >= 1
    assert isinstance(dash["topics"], list)
