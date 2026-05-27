from fastapi.testclient import TestClient

from src import app as app_module
from src.app import app


client = TestClient(app)


def test_root_explains_frontend_when_dist_is_missing(monkeypatch, tmp_path):
    missing_dist = tmp_path / "missing-dist"
    monkeypatch.setattr(app_module, "FRONTEND_DIST", missing_dist)

    r = client.get("/")

    assert r.status_code == 503
    assert "frontend is not built yet" in r.text
    assert "npm run build" in r.text


def test_root_serves_built_frontend_index(monkeypatch, tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    index = dist / "index.html"
    index.write_text("<!doctype html><title>Built StudyBot</title>", encoding="utf-8")
    monkeypatch.setattr(app_module, "FRONTEND_DIST", dist)

    r = client.get("/")

    assert r.status_code == 200
    assert "Built StudyBot" in r.text
