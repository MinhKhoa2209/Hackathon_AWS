# StudyBot — Slide Deck Outline

> 18 slides for the W7 Capstone Demo Day presentation. 40-min slot split:
> - Pitch + Vision: 5 min (slides 1-3)
> - Live Demo: 7 min (slides 4-5)
> - Architecture Walkthrough: 14 min ★ (slides 6-15)
> - Individual QnA: 12 min (no slides — oral)
> - Cost + Lessons: 2 min (slides 16-18)
>
> Each slide below has: **Title**, **Visual** (what to put on slide), **Speaker notes**
> (what to say, ~30s-1min per slide), **Bullets** (key text to show). Team can copy this
> into Google Slides / PowerPoint / Keynote.
>
> Placeholder format: `[TBD …]` — fill before Friday.

---

## Slide 1 — Title

**Visual:**
- Big logo / emoji (📚 or 🧠 — pick one team identity)
- Title: **StudyBot — AI Study Buddy**
- Subtitle: *Upload your notes. Get summaries, flashcards, quizzes — every answer cited.*
- Footer: Group 8 · Domain A (EduTech) · W7 Capstone · 29 May 2026
- Live URL prominently: **https://d2ejfy6ejo0y9l.cloudfront.net**

**Speaker notes (15s):**
> "We're Group 8 and we built StudyBot — an AI study assistant that turns lecture
> PDFs into summaries, flashcards, and quizzes with every answer cited back to
> the slide it came from. Live URL is on screen — feel free to open it during
> the demo."

**Bullets:**
- Group 8 — [TBD list 8 names]
- Domain A · EduTech
- 48-hour build on personal AWS account

---

## Slide 2 — Problem & User

**Visual:**
- Left half: photo / icon of a student with a stack of slides
- Right half: bullet list of the pain
- Big number: **30-90 min** — average time to manually create flashcards from a 40-slide deck

**Speaker notes (60s):**
> "Every university student has lost a Sunday afternoon making flashcards from a
> lecture deck. The pain isn't reading the slides — it's the busywork of turning
> them into study material. We asked: what if you could drop the deck into a tool
> and 30 seconds later have a summary, a flashcard set, and a quiz — all cited
> back to the source slide?
> Our target user is a university student cramming for exams. Self-learners
> reviewing technical docs are a secondary fit."

**Bullets:**
- Target user: university students cramming
- Pain: 30-90 min to manually create study materials per deck
- Existing tools (Quizlet, Khanmigo, NotebookLM) — closest is NotebookLM, but
  not as opinionated about the student workflow

---

## Slide 3 — Solution + Real-world parallels

**Visual:**
- Three-column layout — left to right of one card each:
  - **Summarize** — 5 testable concepts in 1 page
  - **Flashcards** — Q/A deck, flip-to-reveal
  - **Quiz** — 10-MCQ with grading + explanations
- Below: "All answers cited to specific slide chunks (RAG)"
- Real-world parallels banner: Quizlet AI · Khanmigo · Google NotebookLM

**Speaker notes (60s):**
> "Our solution wraps three primitives over Retrieval-Augmented Generation.
> Summarize gives you the five most testable concepts. Flashcards generate a Q/A
> deck. Quiz creates 10 MCQs with grading and explanations. Every answer is
> cited back to the specific slide chunk it came from — no hallucination on
> content you uploaded.
> Architecturally we're closest to Google NotebookLM: RAG over user-uploaded
> documents, grounded responses, chunk-level citation. We borrow the product
> surface and re-implement on AWS-native services."

**Bullets:**
- 3 core features: Summarize · Flashcards · Quiz
- Q&A with citations (RAG via Bedrock KB)
- Real-world parallel: Google NotebookLM (closest architectural twin)
- Differentiator: optimized for the student workflow specifically

---

## Slide 4 — Live Demo: flow we're about to show

**Visual:**
- Numbered diagram: 1 → 2 → 3 → 4 → 5
  1. Open URL
  2. Upload PDF (`wiki_05_energy.txt` or real lecture)
  3. Ask question → see answer + citation
  4. Generate summary (5 concepts)
  5. Generate quiz → answer → grade

**Speaker notes (15s):**
> "Here's the demo flow. I'll open the URL, upload a sample lecture, ask a
> question, generate a summary, and run a quiz. Watch for: real Bedrock
> response time, citations in the answer card, MCQ grading with explanation."

**Bullets:**
- URL: https://d2ejfy6ejo0y9l.cloudfront.net
- Sample doc: `sample_data/wiki_05_energy.txt` (or any PDF you bring)
- Expected response time: 2-4 seconds end-to-end

---

## Slide 5 — Live Demo: in-screen

**Visual:**
- Browser tab on the live URL — DO NOT use a screenshot, this is live demo
- Backup: 30-second screen-recording embedded as a fallback

**Speaker notes (~6 min):**
> Walk through the 5 steps from Slide 4 in the browser. Narrate as you go:
> - "Opening URL. Notice topbar status pills show ai:bedrock, vector:bedrock_kb — production stack, not stub."
> - "Dragging the PDF in… upload completes, doc shows up in library."
> - "Asking 'What is the SI unit for energy?' — answer comes back with citation chunk 1, score 0.x — that's cosine similarity from KB embeddings, not keyword match."
> - "Summarize → 5 concepts, each tied to source content."
> - "Quiz → 10 MCQ. Picking answers… submitting… green/red grading with explanation pulled from the deck."
> - "Persistence test: I'll close this tab — and reopen. The document and history are still there because DynamoDB is the source of truth, not in-memory state."

**Bullets:**
- [Live action — speaker drives browser]
- Persistence check: close tab, reopen, doc + history still there

---

## Slide 6 — Architecture overview (THE BIG ONE — start of 14-min walkthrough)

**Visual:**
- Team's architecture diagram exported as PNG (`assets/architecture.png`)
- Color-code: 7 mandatory boxes in blue, 1 optional (Observability) in amber
- Bottom legend: `Project=studybot, Environment=prod, Region=us-east-1`

**Speaker notes (90s):**
> "Now the architecture. Trainer's browser hits CloudFront. Static React assets
> load from S3 behind Origin Access Control — bucket is private. JS calls /api/*
> back through CloudFront which forwards to API Gateway HTTP API. API Gateway
> proxies into Lambda, which runs FastAPI through Mangum.
> Lambda lives in two private subnets in a VPC. It reaches AWS services
> through VPC endpoints — S3 and DynamoDB via free Gateway Endpoints, Bedrock
> via three Interface Endpoints. No NAT Gateway anywhere; Lambda only talks to
> AWS-internal addresses.
> For the AI feature, Lambda calls Bedrock Knowledge Base — retrieve_and_generate
> in one call. KB embeds and retrieves the chunks from S3 docs bucket; Claude
> Sonnet 4.5 generates the answer with citations.
> DynamoDB stores user state in a single-table design — same partition for the
> user's documents, queries, flashcards, and quiz history."

**Bullets:**
- 7/7 W7 mandatory capabilities present
- 1/3 optional attempted (Observability, partial)
- All traffic AWS-internal — no NAT, no public DB

---

## Slide 7 — Service decision: UI Entry

**Visual:**
- Two boxes side-by-side: **CloudFront** + **API Gateway HTTP API**
- Below each: cost, capability rationale
- Why we picked over alternatives

**Speaker notes (60s):**
> "For the user-facing entry we split into two layers. CloudFront serves the
> React static build with HTTPS free on the `*.cloudfront.net` domain — no
> certificate management. API Gateway HTTP API is the API endpoint behind
> CloudFront's /api/* behavior — it's the cheapest API entry on AWS, and HTTP API
> v2 supports JWT authorizers if we later add Cognito.
> Alternative we rejected: ALB. ALB needs a target group, runs 24/7 even when
> idle (~$16/month), and requires ACM cert lifecycle. API Gateway is pay-per-
> request and free up to 1M calls."

**Bullets:**
- **#1 Edge entry:** CloudFront (HTTPS, OAC, caching)
- **#1 API entry:** API Gateway HTTP API v2 (pay-per-request)
- Alternative rejected: ALB ($16/mo idle, ACM lifecycle)
- W7 Mandatory #1 satisfied

---

## Slide 8 — Service decision: Compute

**Visual:**
- Lambda icon, big
- Tech stack: FastAPI + Mangum + Python 3.12, 1024 MB, 30s timeout
- Zip size: ~14 MB (after stripping bundled boto3, pytest)

**Speaker notes (60s):**
> "Compute is Lambda Python 3.12, running FastAPI through Mangum. Mangum
> translates API Gateway events into ASGI requests so the same FastAPI app runs
> on Lambda, locally with uvicorn, or on ECS — adapter pattern in the code.
> We pay only when invoked. The free tier covers a million requests per month
> which is plenty for hackathon volume.
> Trade-off we accepted: Lambda cold start adds 1-2 seconds on first request
> after idle. For demo this is fine; for production at sustained traffic, we'd
> add provisioned concurrency or move to App Runner."

**Bullets:**
- Lambda Py3.12, 1024 MB, 30s timeout
- FastAPI + Mangum adapter — same code runs anywhere
- Zip size 14 MB (stripped runtime-provided boto3 + pytest)
- Free tier: 1M req/mo, plenty for demo
- Trade-off: cold start ~1-2s; production = provisioned concurrency

---

## Slide 9 — Service decision: AI/ML ★ (most probed in QnA)

**Visual:**
- Stack diagram: Lambda → Bedrock KB → Sonnet 4.5
- Inset: "Sonnet 4.5 vs Haiku — 4/5 prefer Sonnet on lecture-content probe"
- Inference profile string: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`

**Speaker notes (90s):**
> "The AI feature is Bedrock Knowledge Base wrapping Claude Sonnet 4.5 via a
> cross-region inference profile. retrieve_and_generate is one API call that
> embeds the query, fetches the top-K chunks from KB's vector index, and
> generates an answer with citations.
> Why Sonnet 4.5 over Haiku? We ran a blind A/B on five lecture-content probe
> questions. Sonnet gave concrete concept names — 'Conservation of Energy' —
> where Haiku gave vague ones — 'energy thing'. Distractors in MCQ from Sonnet
> were more plausibly wrong; Haiku's were trivially wrong.
> Trade-off: Sonnet costs about 12× per token. For demo's hundred queries that's
> a dollar or two — fine. For production at 10K queries a day, we'd switch back
> to Haiku with stronger few-shot prompting."

**Bullets:**
- **Bedrock Knowledge Base** — retrieve_and_generate (RAG in one call)
- **Claude Sonnet 4.5** via cross-region inference profile
- Blind A/B: [TBD]/5 prefer Sonnet over Haiku on lecture content
- Cost: ~$0.017/query (input ~$0.009, output ~$0.0075)
- Production switch: Haiku + better prompting at >10K queries/day

---

## Slide 10 — Service decision: Data + Object Storage

**Visual:**
- Two side panels:
  - **DynamoDB single-table:** PK=user_id, SK={DOC# | QUERY# | FLASHCARD# | QUIZ#}
  - **S3:** docs bucket (KB source) + frontend bucket (React build behind OAC)
- Diagram showing how a single user's data lives in one DDB partition

**Speaker notes (75s):**
> "User state is a DynamoDB single-table design. Partition key is user_id, sort
> key is a typed prefix — DOC# for uploaded files, QUERY# for ask history,
> FLASHCARD# for generated decks, QUIZ# for quiz attempts. One table, one
> partition per user, single-key reads — no JOINs, no scans, no GSI for
> hackathon scope.
> Object storage is S3 in two buckets. Docs bucket is the Bedrock KB data
> source — uploads land here and trigger KB ingestion. Frontend bucket holds
> the React build behind CloudFront Origin Access Control — bucket has public
> access blocked, only CloudFront can read it.
> Why DynamoDB over RDS? Every read pattern is 'show me this user's X' — single
> key. Postgres adds connection management overhead and a Multi-AZ bill we don't
> need."

**Bullets:**
- DynamoDB on-demand, single-table by user_id
- SK types: DOC# / QUERY# / FLASHCARD# / QUIZ#
- S3: docs (KB source) + frontend (OAC-locked private)
- Rejected RDS: no JOINs needed, on-demand avoids idle billing

---

## Slide 11 — Service decision: Network — VPC, no NAT ★

**Visual:**
- VPC diagram: 2 private subnets, Lambda inside, arrows pointing to
  - S3 Gateway Endpoint (free)
  - DynamoDB Gateway Endpoint (free)
  - 3 Bedrock Interface Endpoints
- Big **NO NAT** stamp
- Cost annotation: NAT would be $2.16/48h, endpoints cost $1.87/48h

**Speaker notes (75s):**
> "Network — the slide we're most often asked about. Lambda lives in two private
> subnets. No NAT Gateway anywhere. Lambda only talks to AWS services, so we use
> VPC endpoints — Gateway Endpoints are free for S3 and DynamoDB, Interface
> Endpoints for the three Bedrock services we use cost $0.013 per hour each.
> Math: NAT would cost $2.16 over 48 hours. Our three Bedrock interface
> endpoints cost $1.87. Net saving: 29 cents. But the bigger win is keeping
> Lambda traffic on AWS backbone — lower latency, no NAT throughput limits, and
> the DB stays cleanly private.
> Single-AZ NAT would be cheaper still — $1.08 — but Lambda multi-AZ ENI
> placement means NAT in one AZ is a single point of failure for the other AZ.
> Skipping NAT entirely sidesteps that."

**Bullets:**
- VPC: 2 private subnets, no public subnet
- Endpoints: S3 + DDB (Gateway, free) + Bedrock-runtime, agent-runtime, agent (Interface, $1.87/48h)
- DB never reachable from public internet
- NAT alternative: $2.16/48h + adds SPOF
- W7 Mandatory #6: full marks

---

## Slide 12 — Service decision: IAM + Identity baseline

**Visual:**
- IAM role tree:
  - `studybot-prod-lambda-role` (one inline policy `studybot-prod-app`)
    - Statement 1: S3 scoped to docs bucket ARN
    - Statement 2: DDB scoped to userstore table ARN
    - Statement 3: Bedrock (resource = "*", limitation explained)
  - `studybot-prod-bedrock-kb-role` (separate role for KB ingestion)
- Identity: `X-User-Id` header from frontend (Cognito optional per W7)

**Speaker notes (60s):**
> "IAM is least-privilege. The Lambda execution role has exactly one inline
> policy with three statements: S3 actions scoped to the docs bucket ARN,
> DynamoDB actions scoped to the userstore table ARN, and Bedrock actions.
> Bedrock unfortunately doesn't support resource-level ARN scoping for
> InvokeModel — we accepted that limitation and documented it.
> User-facing identity is a hardcoded test user via the X-User-Id header.
> Cognito is optional under W7 #7 — we skipped it to avoid burning 3 hours on
> signup/login/email verification flows. Production would add Cognito JWT
> with the same X-User-Id contract."

**Bullets:**
- Single inline policy, 3 statements, scoped ARNs (no AdministratorAccess)
- Bedrock actions — limited to required APIs only, no `*`
- Separate KB ingestion role
- Identity: X-User-Id header (Cognito optional per W7 #7)
- MFA on root: enabled

---

## Slide 13 — Optional capability attempted: #8 Full Observability (partial)

**Visual:**
- Checklist:
  - ✅ CloudWatch dashboard (Lambda + API GW metrics)
  - ✅ Alarm: studybot-prod-lambda-errors (in ALARM state — explain)
  - ❌ Custom metric via PutMetricData (planned)
  - ❌ Log Insights saved query (planned)
- Honesty disclaimer: "2/4 done — claiming partial credit"

**Speaker notes (60s):**
> "Optional capability we attempted is #8 Full Observability. We have two of the
> four components: a CloudWatch dashboard with Lambda errors and duration plus
> API Gateway request and 5xx counts, and an alarm that fires when Lambda
> errors exceed zero over five minutes.
> The alarm is currently in ALARM state — one historical error happened during
> initial deployment when the IAM policy was missing BatchWriteItem. Fixed
> immediately, no errors since, but the 5-minute evaluation window holds the
> alarm in red. Production would set threshold to 1 or 2 to allow sporadic
> error tolerance.
> We didn't ship a custom metric or saved Log Insights query — claiming partial
> credit honestly."

**Bullets:**
- ✅ Dashboard (Lambda + API GW)
- ✅ Alarm in ALARM state (1 historical error, since fixed)
- ❌ PutMetricData custom metric — planned, not shipped
- ❌ Log Insights saved query — planned, not shipped
- **Disclosure: 2/4 of Optional #8 — partial credit**

---

## Slide 14 — Decision deep dive 1: PDF extraction strategy

**Visual:**
- Decision tree:
  - PDF in → measure text density per page
  - If density > threshold → `pypdf` (fast, free)
  - If density ≤ threshold → fallback path (Textract / Vision recommended)
- Numbers panel:
  - pypdf success on 30 sample PDFs: [TBD]%
  - pypdf latency: 0.05s/page
  - Textract latency: 1.5-2s/page
  - Cost saved per 1000 docs: ~$1.50

**Speaker notes (75s):**
> "First deep-dive decision: PDF extraction. The lazy answer is 'Textract
> everywhere' but it's $0.0015 per page and our sample lecture PDFs are about
> 95% text-extractable via pypdf — Textract would be paying for nothing.
> We measure text density per page after extraction. If it's above a threshold
> we trust pypdf. If below — typically scanned slides or image-only decks — we
> flag the doc for fallback. Hackathon scope keeps the fallback as a logged
> warning; production would auto-route to Textract.
> Result: pypdf is essentially free, latency is 30× faster than Textract,
> and we keep the path open for image-heavy decks without forcing every user
> through OCR."

**Bullets:**
- Multi-path: pypdf primary, density-gated fallback
- Eliminated Textract-everywhere ($1.50 wasted per 1000 docs)
- Eliminated Bedrock Vision ($0.04/page × 30× slower)
- Trade-off: image-only PDFs serve degraded response (5-8% of real-world)

---

## Slide 15 — Decision deep dive 2: AI model — Sonnet 4.5 vs Haiku

**Visual:**
- A/B comparison panel:
  - **Q: "Conservation of energy in 1 sentence?"**
    - Haiku: [TBD vague text]
    - Sonnet: [TBD specific text with technical terms]
- Cost ratio bar: Haiku $0.001/q · Sonnet $0.017/q (12×)
- Quality preference: [TBD]/5 prefer Sonnet

**Speaker notes (75s):**
> "Second deep-dive: AI model choice. We started with Haiku because it's
> cheap — $0.001 per query — but blind A/B testing on five probe questions
> showed Haiku's concept names were vaguer and its MCQ distractors trivially
> wrong. Sonnet 4.5 produced concrete concept names and plausible distractors.
> Cost ratio is 12× — Sonnet is $0.017 per query versus Haiku's $0.001. At
> hackathon scale, hundred queries, that's two dollars total — fine. At
> production scale of 10,000 queries per day, that's $170 per day — would force
> a switch back to Haiku with stronger few-shot prompts to recover quality.
> We document this as the production scaling boundary."

**Bullets:**
- Tested both, blind A/B on 5 lecture probes
- Sonnet wins on concept specificity + distractor plausibility
- 12× cost ratio acceptable at hackathon scale
- Production trigger to switch: ≥10K queries/day → Haiku + few-shot prompting
- Documented in `evidence/EVIDENCE_PACK.md §6.5 Decision 2`

---

## Slide 16 — Cost discipline + 3 daily screenshots

**Visual:**
- 3 thumbnail screenshots side by side:
  - Wed EOD: `assets/cost_day1.png` [TBD]
  - Thu EOD: `assets/cost_day2.png` [TBD]
  - Fri AM: `assets/cost_friday.png` [TBD]
- Total spend banner: **$[TBD] / $100** (target <$30 for Bonus Path H)
- Top 3 drivers chart:
  - Bedrock Sonnet 4.5: ~$[TBD]
  - VPC Interface Endpoints × 3: $1.87
  - Everything else: <$0.50

**Speaker notes (60s):**
> "Cost discipline. We're at $[TBD] of the $100 cap, well inside Bonus Path H's
> $30 ceiling.
> Top drivers in order: Bedrock token consumption — mostly Sonnet 4.5 input
> tokens for the document context we pass with each query. Then VPC Interface
> Endpoints — three of them at $0.013 per hour, $1.87 total for 48 hours.
> Everything else combined — CloudFront, Lambda, DynamoDB, S3, CloudWatch — is
> under fifty cents.
> Three daily Cost Explorer screenshots are committed to the repo as evidence.
> What we'd change: at sustained traffic, Bedrock token cost dominates — would
> switch Sonnet → Haiku with prompt engineering, drop Interface Endpoints, add
> Provisioned Concurrency. Different optimization profile."

**Bullets:**
- 3 screenshots Wed/Thu/Fri (in `evidence/` folder, committed)
- Top driver: Bedrock tokens
- Bonus Path H eligible: <$30 with clean teardown + Crit II/III ≥ 4.0
- Teardown plan documented in §8

---

## Slide 17 — Lessons Learned

**Visual:**
- 3 column layout:
  - **Went well**: Adapter pattern survived 3 AI backend pivots without business-logic touch
  - **Would do differently**: Verify AWS account InvokeModel access Day 0 — lost 6 hrs to gating
  - **Surprised us**: Bedrock KB ingestion job throttling — added fallback logic so app degrades gracefully

**Speaker notes (75s):**
> "Three lessons. What went well: the adapter pattern in the application
> code paid off. We pivoted the AI backend three times — Bedrock blocked, Gemini
> external, teammate's account unblocked Bedrock — and didn't touch business
> logic once. Each pivot was 10 lines of adapter code plus an env var change.
> What we'd do differently: lock down the AWS account access plan on Day 0.
> We lost six hours discovering the original account couldn't invoke Bedrock at
> all, filing a support case, exploring Gemini. If we'd run a single InvokeModel
> probe Wednesday morning we'd have shipped Optional #8 fully done by Thursday.
> What surprised us: Bedrock Knowledge Base ingestion jobs can be throttled
> silently. We added a fallback so the app remains usable even if KB sync is
> stuck — uploads still succeed and degrade to a 'sync pending' state instead of
> failing hard."

**Bullets:**
- Adapter pattern → AI backend pivots cost ~10 lines each
- Lost 6 hours to AWS account gating on Wed — verify InvokeModel access Day 0
- Bedrock KB ingestion can throttle silently → degraded-mode fallback added
- One thing a Khanmigo engineer would ask: how do you handle cross-course retrieval contamination? (Currently only filter by user_id — would add course_id metadata)

---

## Slide 18 — Closing: Teardown + Repo + Q&A

**Visual:**
- Big QR code linking to repo (right side)
- Repo URL written out (left side)
- Live URL one more time
- Teardown deadline: Sunday 1 June EOD
- "Questions?" big

**Speaker notes (30s):**
> "We're tearing down by Sunday end-of-day per the W7 mandate — `terraform destroy`
> handles 95% of resources, manual checks for VPC ENIs and CloudWatch log groups.
> Monday morning we'll commit the Cost Explorer screenshot showing zero accruing.
> The repo is public — [TBD repo URL]. Live URL is on screen.
> Happy to take questions."

**Bullets:**
- Live URL: https://d2ejfy6ejo0y9l.cloudfront.net
- Repo: [TBD]
- Teardown: `terraform destroy` Sun 1/6 EOD
- Verification screenshot Mon 2/6 in repo
- **Questions?**

---

# Speaker time budget (target 40 min)

| Section | Slides | Min |
|---|---|---|
| Pitch + Vision | 1-3 | 5 |
| Live Demo | 4-5 | 7 |
| Architecture Walkthrough | 6-15 | 14 ★ |
| Individual QnA | — | 12 |
| Cost + Lessons | 16-18 | 2 |
| **Total** | | **40** |

# Rehearsal checklist

- [ ] Practice slide 5 live demo with fresh browser session (cookies cleared)
- [ ] Confirm live URL responds < 5s on first load (Lambda cold start)
- [ ] Memorize slides 9 + 11 + 14 + 15 — these are most likely QnA probe targets
- [ ] Have backup demo video queued in case URL fails on Friday
- [ ] Every team member can answer: "Why DynamoDB vs RDS?", "Why Sonnet vs Haiku?", "Where does the IAM policy say?", "How does teardown work?"

# Files this slide deck references

| Asset | Status |
|---|---|
| `assets/architecture.png` | [TBD — team is drawing] |
| `assets/cost_day1.png`, `cost_day2.png`, `cost_friday.png` | [TBD — 3 daily screenshots] |
| `assets/dashboard.png` | [TBD — CloudWatch dashboard screenshot] |
| `assets/lambda_latency.png` | [TBD — CloudWatch Lambda Duration histogram] |
| `assets/vpc.png` | [TBD — VPC console screenshot showing endpoints] |
| Demo backup video `assets/demo.mp4` | [TBD — record Thursday afternoon] |
