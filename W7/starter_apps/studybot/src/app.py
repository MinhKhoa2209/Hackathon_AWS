"""FastAPI application — runtime-agnostic.

Runs on:
  - Local laptop:        uvicorn src.app:app --reload
  - AWS Lambda:          wrap with Mangum (pip install mangum) → expose `handler`
  - ECS Fargate / EC2:   uvicorn or gunicorn
  - App Runner:          uvicorn

The choice is yours. Code stays the same.
"""
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import config
from src.adapters import factory
from src import handlers


app = FastAPI(title="StudyBot — W7 Capstone Starter")


# CORS — allow frontend to live on a different origin (CloudFront / Amplify / separate ALB).
# CORS_ORIGINS env var controls this; default '*' is permissive for hackathon.
_allowed = ["*"] if config.cors_origins == "*" else [o.strip() for o in config.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singletons. In serverless this gets re-initialized per cold start; that's fine.
ai_client = factory.make_ai()
storage = factory.make_storage()
userstore = factory.make_userstore()
vector_store = factory.make_vector()


def _resolve_user_id(x_user_id: str | None) -> str:
    """Auth abstraction: extract user_id from header, fall back to default for local dev.

    In production you populate X-User-Id from:
      - Cognito JWT (decoded by API Gateway authorizer)
      - Signed URL claim
      - Custom auth Lambda
    """
    return x_user_id or config.default_user_id


class QueryRequest(BaseModel):
    question: str


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "backends": {
            "ai": config.ai_backend,
            "storage": config.storage_backend,
            "userstore": config.userstore_backend,
            "vector": config.vector_backend,
        },
    }


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    x_user_id: str | None = Header(default=None),
) -> dict:
    user_id = _resolve_user_id(x_user_id)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    return handlers.handle_upload(
        user_id=user_id,
        filename=file.filename or "untitled",
        data=data,
        storage=storage,
        userstore=userstore,
        vector_store=vector_store,
    )


@app.post("/query")
def query(req: QueryRequest, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Empty question")
    return handlers.handle_query(
        user_id=user_id,
        question=req.question,
        ai_client=ai_client,
        userstore=userstore,
        vector_store=vector_store,
        vector_backend=config.vector_backend,
        bedrock_kb_id=config.vector_bedrock_kb_id,
    )


@app.get("/docs/list")
def list_docs(x_user_id: str | None = Header(default=None)) -> dict:
    return handlers.handle_list_docs(_resolve_user_id(x_user_id), userstore)


@app.get("/queries/recent")
def recent(x_user_id: str | None = Header(default=None), limit: int = 10) -> dict:
    return handlers.handle_recent_queries(_resolve_user_id(x_user_id), userstore, limit=limit)


class FlashcardGenerateRequest(BaseModel):
    doc_id: str
    count: int = 5


@app.post("/flashcards/generate")
def generate_flashcards(req: FlashcardGenerateRequest, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    try:
        return handlers.handle_generate_flashcards(
            user_id=user_id,
            doc_id=req.doc_id,
            count=req.count,
            storage=storage,
            userstore=userstore,
            ai_client=ai_client,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/flashcards")
def list_flashcards(doc_id: str | None = None, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    return handlers.handle_list_flashcards(user_id, doc_id, userstore)


@app.delete("/flashcards/{flashcard_id}")
def delete_flashcard(flashcard_id: str, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    return handlers.handle_delete_flashcard(user_id, flashcard_id, userstore)


class QuizGenerateRequest(BaseModel):
    doc_id: str
    count: int = 5


@app.post("/quiz/generate")
def generate_quiz(req: QuizGenerateRequest, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    try:
        return handlers.handle_generate_quiz(
            user_id=user_id,
            doc_id=req.doc_id,
            count=req.count,
            storage=storage,
            userstore=userstore,
            ai_client=ai_client,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/quiz")
def list_quizzes(doc_id: str | None = None, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    return handlers.handle_list_quizzes(user_id, doc_id, userstore)


@app.delete("/quiz/{quiz_id}")
def delete_quiz(quiz_id: str, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = _resolve_user_id(x_user_id)
    return handlers.handle_delete_quiz(user_id, quiz_id, userstore)


# ---- Static frontend ----
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"


def frontend_index_response() -> Response:
    index_path = FRONTEND_DIST / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return HTMLResponse(
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>StudyBot frontend not built</title>
            <style>
              body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
              main { max-width: 720px; margin: 12vh auto; padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; }
              code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <main>
              <h1>StudyBot frontend is not built yet</h1>
              <p>Run <code>npm install</code> and <code>npm run build</code> from <code>frontend/</code>, then restart FastAPI.</p>
              <p>The API is still available. Try <code>/health</code> to verify the backend.</p>
            </main>
          </body>
        </html>
        """,
        status_code=503,
    )


if config.serve_frontend:
    if FRONTEND_ASSETS.exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="frontend-assets")

    @app.get("/", response_model=None)
    def index() -> Response:
        """Convenience: serves frontend/dist/index.html at /. Set SERVE_FRONTEND=false
        if you deploy the frontend separately (CloudFront+S3, Amplify, ALB)."""
        return frontend_index_response()
