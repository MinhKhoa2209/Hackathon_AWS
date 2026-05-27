import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("AI_BACKEND", "local")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("USERSTORE_BACKEND", "sqlite")
os.environ.setdefault("VECTOR_BACKEND", "local")

_tmp = tempfile.mkdtemp(prefix="studybot-capstone-test-")
os.environ["STORAGE_LOCAL_DIR"] = str(Path(_tmp) / "uploads")
os.environ["USERSTORE_SQLITE_PATH"] = str(Path(_tmp) / "users.db")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from src import handlers
from src.app import app


client = TestClient(app)


LECTURE_NOTES = "\n\n".join(
    [
        "Slide 1: Backpropagation computes gradients for each model weight. "
        "These gradients tell the optimizer how to reduce prediction error.",
        "Slide 2: A confusion matrix compares predicted labels with actual labels. "
        "Rows and columns expose false positives and false negatives.",
        "Slide 3: Activation functions add non-linearity to neural networks. "
        "Without activation functions, stacked layers collapse into a linear model.",
        "Slide 4: Overfitting happens when a model memorizes training examples. "
        "Validation data helps detect poor generalization.",
        "Slide 5: The learning rate controls the size of optimizer updates. "
        "Large values can diverge, while tiny values can train slowly.",
        "Slide 6: Table - Model, Precision, Recall. Baseline, 0.72, 0.68. Tuned, 0.84, 0.79.",
        "Slide 7: Figure caption - Validation loss decreases for six epochs and then rises.",
        "Slide 8: Equation - cross entropy equals negative sum of target log probability.",
        "Slide 9: Code block - optimizer.step applies the current gradients to parameters.",
    ]
    + [
        f"Slide {idx}: Review slide {idx} reinforces the same lecture vocabulary for retrieval tests."
        for idx in range(10, 41)
    ]
)


def upload_notes(user_id: str, filename: str = "ai-study-buddy-lecture.md") -> str:
    response = client.post(
        "/upload",
        files={"file": (filename, LECTURE_NOTES.encode("utf-8"), "text/markdown")},
        headers={"X-User-Id": user_id},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["chars_extracted"] > 1000
    assert body["status"] == "completed"
    assert body["extraction_method"]
    assert "confidence_score" in body
    assert "processing_time" in body
    assert "fallback_reason" in body
    return body["doc_id"]


def test_supported_upload_formats_text_and_markdown():
    for filename, media_type in [("lecture.txt", "text/plain"), ("lecture.md", "text/markdown")]:
        response = client.post(
            "/upload",
            files={"file": (filename, b"Slide 1: Retrieval augmented generation uses citations.", media_type)},
            headers={"X-User-Id": f"format-{filename}"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["filename"] == filename
        assert response.json()["chars_extracted"] > 0


def test_user_stories_summary_qa_quiz_and_dashboard():
    user_id = "capstone-user-stories"
    doc_id = upload_notes(user_id)

    summary = client.post(
        "/summary/generate",
        json={"doc_id": doc_id},
        headers={"X-User-Id": user_id},
    )
    assert summary.status_code == 200, summary.text
    summary_body = summary.json()
    assert summary_body["summary"]
    assert "StudyBot W7 sample lecture PDF" not in summary_body["summary"]
    assert "Slide 1:" not in summary_body["summary"]
    assert any(term in summary_body["summary"].lower() for term in ["extraction", "retrieval", "chunk", "cost", "latency"])
    assert len(summary_body["testable_concepts"]) == 5

    answer = client.post(
        "/query",
        json={"question": "What does a confusion matrix compare?"},
        headers={"X-User-Id": user_id},
    )
    assert answer.status_code == 200, answer.text
    answer_body = answer.json()
    assert answer_body["answer"]
    assert len(answer_body["answer"].split()) > 8
    assert answer_body["citations"]
    assert any("confusion matrix" in citation["text"].lower() for citation in answer_body["citations"][:3])

    quiz = client.post(
        "/quiz/generate",
        json={"doc_id": doc_id, "count": 10},
        headers={"X-User-Id": user_id},
    )
    assert quiz.status_code == 200, quiz.text
    quiz_body = quiz.json()
    assert len(quiz_body["quizzes"]) == 10
    assert all(len(item["options"]) == 4 for item in quiz_body["quizzes"])
    question_texts = [item["question"] for item in quiz_body["quizzes"]]
    assert len(set(question_texts)) == len(question_texts)
    assert all("Which statement is supported by the uploaded notes?" not in text for text in question_texts)
    assert len({item["correct_option"] for item in quiz_body["quizzes"]}) > 1
    assert any("architecture" in item["question"].lower() for item in quiz_body["quizzes"])
    assert any("flow" in item["question"].lower() for item in quiz_body["quizzes"])

    dashboard = client.get("/dashboard", headers={"X-User-Id": user_id})
    assert dashboard.status_code == 200
    dashboard_body = dashboard.json()
    assert len(dashboard_body["activity"]) == 7
    assert dashboard_body["studied_count"] >= 1
    assert dashboard_body["active_days"] >= 1


def test_retrieval_quality_precision_at_3_on_probe_questions():
    user_id = "capstone-retrieval-quality"
    upload_notes(user_id)

    probes = [
        ("What does backpropagation compute?", "backpropagation"),
        ("What does a confusion matrix compare?", "confusion matrix"),
        ("Why are activation functions used?", "activation functions"),
        ("What is overfitting?", "overfitting"),
        ("Why does the learning rate matter?", "learning rate"),
    ]

    hits = 0
    for question, expected in probes:
        response = client.post(
            "/query",
            json={"question": question},
            headers={"X-User-Id": user_id},
        )
        assert response.status_code == 200, response.text
        top_3 = " ".join(citation["text"].lower() for citation in response.json()["citations"][:3])
        if expected in top_3:
            hits += 1

    precision_at_3 = hits / len(probes)
    assert precision_at_3 >= 0.80


def test_chunking_is_conscious_sentence_aware_and_bounded():
    text = "Alpha sentence explains one concept. " * 20 + "Beta sentence explains another concept. " * 20
    chunks = handlers._chunk_text(text, size=700)

    assert len(chunks) > 1
    assert all(len(chunk) <= 760 for chunk in chunks)
    assert all(not chunk.startswith(" ") and not chunk.endswith(" ") for chunk in chunks)


def test_core_challenge_evidence_pack_documents_known_gaps():
    evidence = PROJECT_ROOT / "evidence" / "EVIDENCE_PACK.md"
    content = evidence.read_text(encoding="utf-8").lower()

    for phrase in [
        "non-trivial extraction",
        "precision@3",
        "chunking decision",
        "failure mode",
        "text density",
        "slide-aware",
    ]:
        assert phrase in content
