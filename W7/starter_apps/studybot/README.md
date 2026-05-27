# StudyBot - W7 Capstone Starter

**Domain:** EduTech. Upload lecture notes (PDF/TXT/Markdown), ask grounded questions, generate flashcards, and take a quiz from your own material.

The backend runs locally with SQLite + filesystem + local AI stub. The frontend is a Vite React TypeScript app with Tailwind CSS. Flip env vars when you are ready to deploy on AWS Bedrock + S3 + your chosen DB.

---

## Run Locally

### 1. Install

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env

cd frontend
npm install
cd ..
```

### 2. Dev mode: FastAPI + Vite

Terminal 1:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.app:app --reload --port 8000
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies API requests to FastAPI on `:8000`.

### 3. Demo mode: one FastAPI origin

```powershell
cd frontend
npm run build
cd ..
.\.venv\Scripts\python.exe -m uvicorn src.app:app --reload --port 8000
```

Open `http://localhost:8000`. FastAPI serves `frontend/dist/index.html` and `/assets/*`.

If `frontend/dist` is missing, `/` returns a clear 503 page explaining how to build the UI. The API still works.

---

## Smoke Test The API

```powershell
curl http://localhost:8000/health

curl -X POST http://localhost:8000/upload `
  -H "X-User-Id: alice" `
  -F "file=@sample_data/wiki_01_computer.txt"

curl -X POST http://localhost:8000/query `
  -H "X-User-Id: alice" `
  -H "Content-Type: application/json" `
  -d "{\"question\":\"What is a computer?\"}"

curl http://localhost:8000/docs/list -H "X-User-Id: alice"
```

Run tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm run build
```

---

## Frontend Configuration

The React UI supports:

- `?api=https://api.example.com` to override the API base at runtime.
- `?user=alice` to set the `X-User-Id` request header.
- `VITE_API_BASE` for build/dev-time API base when not using Vite proxy.
- `localStorage.studybot.language` with `en` or `vi` for the EN/VI toggle.

For split hosting, deploy `frontend/dist` to S3/CloudFront or Amplify, set `SERVE_FRONTEND=false` on the backend, and set `CORS_ORIGINS` to the frontend URL.

---

## What's In The Code

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── App.tsx
    ├── api.ts
    ├── i18n.ts
    └── components/

src/
├── app.py               FastAPI app + routes + built frontend serving
├── config.py            Reads settings from env vars
├── handlers.py          RAG, flashcard, and quiz business logic
└── adapters/
    ├── ai.py            BedrockAI | LocalAI
    ├── storage.py       S3Storage | LocalStorage
    ├── userstore.py     DynamoDB | Postgres | SQLite | DocumentDB | MySQL
    ├── vector.py        BedrockKBVector | LocalVector
    └── factory.py       Env-driven adapter factory
```

---

## Deploy To AWS - Env Flip

After provisioning AWS resources, edit `.env`:

```diff
- AI_BACKEND=local
+ AI_BACKEND=bedrock
+ AI_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0

- STORAGE_BACKEND=local
+ STORAGE_BACKEND=s3
+ STORAGE_BUCKET=studybot-uploads-g<N>-<accountid>

- USERSTORE_BACKEND=sqlite
+ USERSTORE_BACKEND=dynamodb
+ USERSTORE_TABLE=studybot-users

- VECTOR_BACKEND=local
+ VECTOR_BACKEND=bedrock_kb
+ VECTOR_BEDROCK_KB_ID=ABCDEFG123
```

Build the frontend before packaging or deploying if FastAPI will serve the UI:

```powershell
cd frontend
npm run build
```

**Lambda packaging example:**

```python
from mangum import Mangum
from src.app import app

handler = Mangum(app)
```

For ECS, EC2, or App Runner:

```powershell
uvicorn src.app:app --host 0.0.0.0 --port 8000
```

---

## W7 Decisions You Still Own

| # | Decision | Options |
|---|----------|---------|
| 1 | Compute runtime | Lambda, ECS Fargate, EC2, App Runner |
| 2 | DB backend | DynamoDB, RDS Postgres/MySQL, DocumentDB, SQLite local |
| 3 | Vector store | Bedrock KB backed by OpenSearch Serverless, S3 Vectors, Aurora pgvector, etc. |
| 4 | Frontend hosting | FastAPI-served dist, CloudFront+S3, Amplify |
| 5 | Identity | Cognito JWT, hardcoded demo user, signed URL, custom auth |
| 6 | VPC topology | Subnets, security groups, NAT vs VPC endpoints |
| 7 | IaC | Console, CloudFormation, CDK, Terraform, SAM |
| 8 | Observability | CloudWatch dashboard, alarm, custom metric, Log Insights |
| 9 | Cost optimization | Model choice, vector backend, sizing, single-AZ decisions |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/` says frontend is not built | Run `cd frontend; npm install; npm run build`, then restart FastAPI. |
| Vite UI cannot reach API | Confirm FastAPI is on `:8000`, or open Vite with `?api=http://localhost:8000`. |
| `[LOCAL_AI_STUB]` in answer | You are still in local mode. Set `AI_BACKEND=bedrock` and AWS credentials for real output. |
| Bedrock `AccessDeniedException` | Enable model access in the Bedrock console first. |
| Bedrock KB returns empty | Run/sync the KB ingestion job after uploading documents to the KB data source. |
| SQLite database locked | Do not run multiple workers with SQLite. Use DynamoDB or Postgres in production. |
