"""Endpoint handlers. Pure business logic — knows nothing about FastAPI or AWS specifics."""
import io
import json
import re
import time
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional


PROMPT_TEMPLATE = """You are a grounded AI assistant.

Your task is to answer questions using ONLY the retrieved context.

STRICT RULES:

1. Write a clean, natural answer for humans.
2. NEVER include raw chunk text.
3. NEVER show internal metadata:
   - chunk id
   - source labels
   - document ids
   - embeddings info
   - retrieval scores
   - URLs
4. NEVER mention:
   - "According to the context"
   - "Based on retrieved documents"
   - "The source says"
5. Synthesize information from retrieved chunks into a concise explanation.
6. If multiple chunks support the answer, combine them naturally.
7. Do NOT repeat source text verbatim unless necessary.
8. Keep responses concise, clear, and human-readable.
9. DO NOT output citations, references, source lists, or document names.
10. NEVER expose retrieval internals.

If the answer is not supported by retrieved context, return exactly:

"I couldn't find enough grounded information in the uploaded documents."

Retrieved Context:
{context}

Question:
{question}

Return ONLY valid JSON in this format:

{{
  "answer": "clean grounded response"
}}"""


FALLBACK_ANSWER = "I couldn't find enough grounded information in the uploaded documents."


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ExtractionResult:
    text: str
    method: str
    confidence: float
    processing_time: float
    fallback_reason: str
    text_density: float = 0.0
    image_ratio: float = 0.0
    table_presence: bool = False
    scanned: bool = False


def _extract_with_pypdf(data: bytes) -> tuple[str, int, int]:
    try:
        from pypdf import PdfReader
    except ImportError:
        return "(pypdf not installed - install requirements.txt)", 1, 0
    reader = PdfReader(io.BytesIO(data))
    page_texts = []
    image_pages = 0
    for page in reader.pages:
        page_texts.append(page.extract_text() or "")
        try:
            if getattr(page, "images", None):
                image_pages += 1
        except Exception:
            pass
    return "\n\n".join(page_texts), max(len(reader.pages), 1), image_pages


def _looks_like_table(text: str) -> bool:
    table_lines = [
        line for line in text.splitlines()
        if "|" in line or len(re.findall(r"\s{2,}", line)) >= 2 or len(re.findall(r"\b\d+\.\d+\b", line)) >= 2
    ]
    return len(table_lines) >= 2


def _extract_text_hybrid(filename: str, data: bytes) -> ExtractionResult:
    """Extract text and record the extraction decision. Textract/Vision are explicit fallbacks, never default."""
    start = time.perf_counter()
    name = filename.lower()
    if name.endswith(".pdf"):
        text, page_count, image_pages = _extract_with_pypdf(data)
        density = len(text.strip()) / max(page_count, 1)
        image_ratio = image_pages / max(page_count, 1)
        table_presence = _looks_like_table(text)
        scanned = density < 30 and image_ratio > 0.5

        if density > 100:
            method = "pypdf"
            reason = "text_density_above_100_chars_per_page"
            confidence = 0.90 if not table_presence else 0.82
        elif image_ratio > 0.45:
            method = "claude_vision_fallback_recommended"
            reason = "low_text_density_with_many_images"
            confidence = 0.45
        else:
            method = "textract_fallback_recommended"
            reason = "low_text_density_or_table_heavy_pdf"
            confidence = 0.55 if table_presence else 0.40

        return ExtractionResult(
            text=text,
            method=method,
            confidence=confidence,
            processing_time=round(time.perf_counter() - start, 4),
            fallback_reason=reason,
            text_density=round(density, 2),
            image_ratio=round(image_ratio, 2),
            table_presence=table_presence,
            scanned=scanned,
        )

    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        text = ""
    return ExtractionResult(
        text=text,
        method="utf8_text",
        confidence=0.98 if text.strip() else 0.0,
        processing_time=round(time.perf_counter() - start, 4),
        fallback_reason="not_pdf",
        text_density=float(len(text)),
        table_presence=_looks_like_table(text),
    )


def _extract_text(filename: str, data: bytes) -> str:
    """Backward-compatible plain text extractor."""
    return _extract_text_hybrid(filename, data).text


def _chunk_text(text: str, size: int = 700) -> list[str]:
    slide_sections = [part.strip() for part in re.split(r"\n\s*(?=Slide\s+\d+\s*:)", text) if part.strip()]
    if len(slide_sections) > 1:
        chunks: list[str] = []
        for section in slide_sections:
            if len(section) <= size:
                chunks.append(section)
            else:
                chunks.extend(_chunk_text(section, size=size))
        return chunks

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) < size:
            current = f"{current} {sentence}".strip()
            continue
        if current:
            chunks.append(current)
        current = sentence
    if current:
        chunks.append(current)
    return chunks or [text]


def _parse_created_at(value: object) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value).strip()
        if raw.endswith("Z"):
            raw = f"{raw[:-1]}+00:00"
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            try:
                dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _week_start(now: datetime) -> datetime:
    today = now.astimezone(timezone.utc)
    start = today - timedelta(days=today.weekday())
    return start.replace(hour=0, minute=0, second=0, microsecond=0)


def _topic_candidates(text: str) -> list[str]:
    stop = {
        "about", "after", "answer", "because", "could", "from", "have", "into",
        "notes", "should", "that", "their", "there", "this", "what", "when",
        "where", "which", "with", "your",
    }
    return [
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", text)
        if token.lower() not in stop
    ]


def _clean_answer_response(text: str) -> str:
    cleaned = clean_json_response(text)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and isinstance(parsed.get("answer"), str):
            answer = parsed["answer"].strip()
            return answer or FALLBACK_ANSWER
    except Exception:
        pass

    answer = re.sub(r"\[chunk\s+\d+\]", "", cleaned, flags=re.IGNORECASE)
    answer = re.sub(r"_?Source:\s*.*", "", answer, flags=re.IGNORECASE)
    answer = re.sub(r"_?URL:\s*\S+", "", answer, flags=re.IGNORECASE)
    answer = re.sub(r"\(Sources?:.*?\)", "", answer, flags=re.IGNORECASE)
    answer = answer.strip()
    return answer or FALLBACK_ANSWER


def _fallback_search_uploaded_docs(user_id: str, question: str, storage, userstore, top_k: int = 5) -> list[dict]:
    stop = {
        "about", "after", "also", "answer", "because", "does", "from", "have",
        "into", "notes", "should", "that", "their", "there", "this", "what",
        "when", "where", "which", "with", "would", "your", "the", "and",
        "are", "for", "how", "is",
    }
    tokens = {t.lower() for t in re.findall(r"\w+", question) if len(t) > 2 and t.lower() not in stop}
    scored: list[dict] = []
    backup: list[dict] = []
    for doc in userstore.list_docs(user_id):
        filename = doc.get("filename", "untitled")
        doc_id = doc.get("doc_id", "")
        if not doc_id:
            continue
        try:
            data = storage.get(f"{user_id}/{doc_id}/{filename}")
            text = _extract_text(filename, data)
        except Exception:
            continue
        for idx, chunk in enumerate(_chunk_text(text)):
            item = {
                "text": chunk,
                "doc_id": doc_id,
                "score": 0.1,
                "metadata": {"filename": filename, "chunk_idx": idx},
            }
            if len(backup) < top_k:
                backup.append(item)
            chunk_tokens = re.findall(r"\w+", chunk.lower())
            score = sum(1 for token in chunk_tokens if token in tokens)
            if score > 0:
                scored.append({**item, "score": float(score)})
    scored.sort(key=lambda item: item["score"], reverse=True)
    if scored:
        top_score = scored[0]["score"]
        threshold = max(2.0, top_score * 0.5)
        return [item for item in scored if item["score"] >= threshold][:top_k]
    return backup


def handle_upload(
    user_id: str,
    filename: str,
    data: bytes,
    storage,
    userstore,
    vector_store,
) -> dict:
    """Store the file, extract text, ingest into vector store, record in userstore."""
    doc_id = str(uuid.uuid4())
    key = f"{user_id}/{doc_id}/{filename}"
    location = storage.put(key, data)
    extraction = _extract_text_hybrid(filename, data)
    text = extraction.text
    ingestion = {"status": "skipped"}
    if text.strip():
        ingestion = vector_store.ingest(doc_id=doc_id, text=text, metadata={"user_id": user_id, "filename": filename})
    userstore.add_doc(
        user_id=user_id,
        doc_id=doc_id,
        metadata={
            "filename": filename,
            "size": len(data),
            "location": location,
            "chars": len(text),
            "status": "completed" if text.strip() else "failed",
            "extraction_method": extraction.method,
            "confidence_score": extraction.confidence,
            "processing_time": extraction.processing_time,
            "fallback_reason": extraction.fallback_reason,
            "text_density": extraction.text_density,
            "image_ratio": extraction.image_ratio,
            "table_presence": extraction.table_presence,
            "scanned": extraction.scanned,
            "ingestion_status": ingestion.get("status"),
            "ingestion_job_id": ingestion.get("job_id"),
        },
    )
    return {
        "doc_id": doc_id,
        "filename": filename,
        "size": len(data),
        "chars_extracted": len(text),
        "location": location,
        "status": "completed" if text.strip() else "failed",
        "extraction_method": extraction.method,
        "confidence_score": extraction.confidence,
        "processing_time": extraction.processing_time,
        "fallback_reason": extraction.fallback_reason,
        "text_density": extraction.text_density,
        "image_ratio": extraction.image_ratio,
        "table_presence": extraction.table_presence,
        "scanned": extraction.scanned,
        "ingestion_status": ingestion.get("status"),
        "ingestion_job_id": ingestion.get("job_id"),
    }


def handle_query(
    user_id: str,
    question: str,
    ai_client,
    storage,
    userstore,
    vector_store,
    vector_backend: str,
    bedrock_kb_id: str,
) -> dict:
    """RAG flow: retrieve user's relevant chunks → call AI with context → log + return."""
    if vector_backend == "bedrock_kb":
        result = {"answer": FALLBACK_ANSWER, "citations": []}
        try:
            result = ai_client.retrieve_and_generate(query=question, kb_id=bedrock_kb_id)
        except Exception:
            result = {"answer": FALLBACK_ANSWER, "citations": []}
        answer = result["answer"]
        citations = result["citations"]
        weak_answer = any(
            phrase in answer.lower()
            for phrase in [
                "unable to assist",
                "couldn't find enough",
                "could not find",
                "no relevant",
            ]
        )
        if not citations or weak_answer:
            chunks = _fallback_search_uploaded_docs(user_id, question, storage=storage, userstore=userstore)
            if chunks:
                context = "\n\n".join(f"[chunk {i+1}] {c['text']}" for i, c in enumerate(chunks))
                prompt = PROMPT_TEMPLATE.format(context=context, question=question)
                answer = _clean_answer_response(ai_client.invoke(prompt, max_tokens=512))
                citations = [
                    {
                        "chunk": i + 1,
                        "doc_id": c["doc_id"],
                        "filename": c.get("metadata", {}).get("filename"),
                        "score": c["score"],
                        "text": c["text"][:200],
                    }
                    for i, c in enumerate(chunks)
                ]
    else:
        # Local path: do our own retrieve then prompt
        chunks = vector_store.search(question, top_k=5, filter={"user_id": user_id})
        if not chunks:
            chunks = _fallback_search_uploaded_docs(user_id, question, storage=storage, userstore=userstore)
        if not chunks:
            answer = "No relevant content found in your uploaded documents. Upload some first."
            citations = []
        else:
            context = "\n\n".join(f"[chunk {i+1}] {c['text']}" for i, c in enumerate(chunks))
            prompt = PROMPT_TEMPLATE.format(context=context, question=question)
            answer = _clean_answer_response(ai_client.invoke(prompt, max_tokens=512))
            citations = [
                {
                    "chunk": i + 1,
                    "doc_id": c["doc_id"],
                    "filename": c.get("metadata", {}).get("filename"),
                    "score": c["score"],
                    "text": c["text"][:200],
                }
                for i, c in enumerate(chunks)
            ]

    userstore.log_query(user_id=user_id, query=question, answer=answer)
    return {"question": question, "answer": answer, "citations": citations}


def handle_list_docs(user_id: str, userstore) -> dict:
    return {"user_id": user_id, "docs": userstore.list_docs(user_id)}


def handle_recent_queries(user_id: str, userstore, limit: int = 10) -> dict:
    return {"user_id": user_id, "queries": userstore.recent_queries(user_id, limit=limit)}


SUMMARY_PROMPT_TEMPLATE = """You are an engineering-focused study assistant. Create a one-page study guide for the uploaded lecture notes.
Focus on engineering decisions, tradeoffs, architecture reasoning, optimization decisions, and cost/performance analysis.
Avoid generic textbook summaries. Prefer concrete decisions and measurements when present.

Return ONLY valid JSON with:
1. "summary": a concise one-page summary in 3 to 5 short paragraphs about the engineering reasoning.
2. "testable_concepts": exactly 5 objects with "concept" and "why_testable"; each concept should be an engineering decision, tradeoff, architecture mechanism, optimization, or cost/performance point.

TEXT:
{text}
"""


def handle_generate_summary(
    user_id: str,
    doc_id: str,
    storage,
    userstore,
    ai_client,
) -> dict:
    docs = userstore.list_docs(user_id)
    doc_meta = next((d for d in docs if d["doc_id"] == doc_id), None)
    if not doc_meta:
        raise ValueError(f"Document {doc_id} not found for user")

    filename = doc_meta.get("filename", "untitled")
    data = storage.get(f"{user_id}/{doc_id}/{filename}")
    text = _extract_text(filename, data)
    if not text.strip():
        raise ValueError("Document has no extractable text")

    prompt = SUMMARY_PROMPT_TEMPLATE.format(text=text[:12000])
    ai_response = ai_client.invoke(prompt, max_tokens=1536)
    cleaned = clean_json_response(ai_response)
    try:
        parsed = json.loads(cleaned)
    except Exception as e:
        raise ValueError(f"Failed to parse AI response: {ai_response}") from e

    concepts = parsed.get("testable_concepts", [])
    if not isinstance(concepts, list):
        concepts = []
    normalized = []
    for item in concepts[:5]:
        if isinstance(item, dict):
            normalized.append({
                "concept": str(item.get("concept", "Key concept")),
                "why_testable": str(item.get("why_testable", "Likely to appear in assessment.")),
            })
        else:
            normalized.append({"concept": str(item), "why_testable": "Likely to appear in assessment."})

    return {
        "id": _stable_item_id("summary", user_id, doc_id),
        "doc_id": doc_id,
        "filename": filename,
        "summary": str(parsed.get("summary", "")).strip(),
        "testable_concepts": normalized,
        "status": "completed",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "extraction_method": doc_meta.get("extraction_method"),
        "confidence_score": doc_meta.get("confidence_score"),
        "processing_time": doc_meta.get("processing_time"),
        "fallback_reason": doc_meta.get("fallback_reason"),
    }


def handle_dashboard(user_id: str, userstore) -> dict:
    now = datetime.now(timezone.utc)
    start = _week_start(now)
    day_keys = [(start + timedelta(days=i)).date().isoformat() for i in range(7)]
    day_counts = {day: {"date": day, "queries": 0, "docs": 0, "cards": 0, "quiz": 0} for day in day_keys}

    docs = userstore.list_docs(user_id)
    queries = userstore.recent_queries(user_id, limit=100)
    flashcards = userstore.list_flashcards(user_id, None) if hasattr(userstore, "list_flashcards") else []
    quizzes = userstore.list_quizzes(user_id, None) if hasattr(userstore, "list_quizzes") else []

    collections = [
        ("docs", docs),
        ("queries", queries),
        ("cards", flashcards),
        ("quiz", quizzes),
    ]
    for bucket, items in collections:
        for item in items:
            created = _parse_created_at(item.get("created_at"))
            if not created or created < start:
                continue
            key = created.date().isoformat()
            if key in day_counts:
                day_counts[key][bucket] += 1

    topic_counts = Counter()
    for query in queries:
        created = _parse_created_at(query.get("created_at"))
        if created and created >= start:
            topic_counts.update(_topic_candidates(query.get("query", ""))[:4])
    if not topic_counts:
        for doc in docs:
            created = _parse_created_at(doc.get("created_at"))
            if created and created >= start:
                topic_counts.update(_topic_candidates(doc.get("filename", ""))[:3])

    active_days = sum(
        1
        for day in day_counts.values()
        if day["queries"] + day["docs"] + day["cards"] + day["quiz"] > 0
    )
    studied_count = sum(day["queries"] for day in day_counts.values())

    return {
        "user_id": user_id,
        "week_start": start.date().isoformat(),
        "week_end": (start + timedelta(days=6)).date().isoformat(),
        "active_days": active_days,
        "studied_count": studied_count,
        "activity": list(day_counts.values()),
        "topics": [
            {"topic": topic, "count": count}
            for topic, count in topic_counts.most_common(8)
        ],
        "recent_queries": queries[:6],
    }


FLASHCARD_PROMPT_TEMPLATE = """You are a study assistant. Generate a JSON list of flashcards (question and answer pairs) based on the following text.
Generate exactly {count} flashcards.
Each flashcard must have a "question" (concise, clear query about a key concept) and an "answer" (accurate, concise explanation).
Return ONLY a valid JSON array of objects, where each object has "question" and "answer" keys. Do not include markdown formatting or extra text.

TEXT:
{text}
"""

def clean_json_response(text: str) -> str:
    import re
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _stable_item_id(prefix: str, *parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    return f"{prefix}_{uuid.uuid5(uuid.NAMESPACE_URL, raw)}"


def _normalize_doc_ids(doc_id: str | None = None, doc_ids: list[str] | None = None) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in doc_ids or []:
        normalized = str(value).strip()
        if not normalized or normalized in seen:
            continue
        ordered.append(normalized)
        seen.add(normalized)
    if doc_id:
        normalized = str(doc_id).strip()
        if normalized and normalized not in seen:
            ordered.append(normalized)
    if not ordered:
        raise ValueError("At least one document must be selected")
    return ordered


def _combined_doc_id(doc_ids: list[str]) -> str:
    if len(doc_ids) == 1:
        return doc_ids[0]
    return f"bundle:{','.join(sorted(doc_ids))}"


def _load_selected_docs(user_id: str, doc_ids: list[str], storage, userstore) -> list[dict]:
    docs_by_id = {doc["doc_id"]: doc for doc in userstore.list_docs(user_id)}
    selected_docs: list[dict] = []
    for selected_id in doc_ids:
        doc_meta = docs_by_id.get(selected_id)
        if not doc_meta:
            raise ValueError(f"Document {selected_id} not found for user")
        filename = doc_meta.get("filename", "untitled")
        key = f"{user_id}/{selected_id}/{filename}"
        data = storage.get(key)
        text = _extract_text(filename, data)
        if not text.strip():
            raise ValueError(f"Document {filename} has no extractable text")
        selected_docs.append({
            "doc_id": selected_id,
            "filename": filename,
            "text": text,
        })
    return selected_docs


def _build_combined_prompt_text(selected_docs: list[dict], total_budget: int) -> str:
    if not selected_docs:
        return ""
    per_doc_budget = max(1500, total_budget // len(selected_docs))
    sections = []
    for item in selected_docs:
        excerpt = item["text"][:per_doc_budget].strip()
        sections.append(f"Document: {item['filename']}\n{excerpt}")
    return "\n\n---\n\n".join(sections)[:total_budget]

def handle_generate_flashcards(
    user_id: str,
    doc_id: str | None,
    doc_ids: list[str] | None,
    count: int,
    storage,
    userstore,
    ai_client,
) -> dict:
    import json
    import re
    selected_doc_ids = _normalize_doc_ids(doc_id=doc_id, doc_ids=doc_ids)
    group_doc_id = _combined_doc_id(selected_doc_ids)
    selected_docs = _load_selected_docs(user_id, selected_doc_ids, storage, userstore)
    sample_text = _build_combined_prompt_text(selected_docs, total_budget=10000)
    prompt = FLASHCARD_PROMPT_TEMPLATE.format(count=count, text=sample_text)
    ai_response = ai_client.invoke(prompt, max_tokens=1024)
    
    cleaned = clean_json_response(ai_response)
    try:
        cards = json.loads(cleaned)
        if not isinstance(cards, list):
            if isinstance(cards, dict) and "flashcards" in cards:
                cards = cards["flashcards"]
            else:
                raise ValueError("AI response did not parse as a list of flashcards")
    except Exception as e:
        try:
            items = re.findall(r'\{\s*"question"\s*:\s*"(.*?)"\s*,\s*"answer"\s*:\s*"(.*?)"\s*\}', cleaned, re.DOTALL)
            cards = [{"question": q.strip(), "answer": a.strip()} for q, a in items]
        except Exception:
            cards = []
        if not cards:
            raise ValueError(f"Failed to parse AI response: {ai_response}") from e
                
    existing_cards = userstore.list_flashcards(user_id, group_doc_id) if hasattr(userstore, "list_flashcards") else []
    for existing_card in existing_cards:
        card_id = existing_card.get("id") or existing_card.get("flashcard_id")
        if card_id:
            userstore.delete_flashcard(user_id, card_id)

    saved_cards = []
    created_at = _now_iso()
    for idx, card in enumerate(cards):
        q = card.get("question", "Question")
        a = card.get("answer", "Answer")
        flashcard_id = _stable_item_id("card", user_id, group_doc_id, idx, q)
        userstore.add_flashcard(
            user_id=user_id,
            doc_id=group_doc_id,
            flashcard_id=flashcard_id,
            question=q,
            answer=a,
        )
        saved_cards.append({
            "id": flashcard_id,
            "doc_id": group_doc_id,
            "source_doc_ids": selected_doc_ids,
            "question": q,
            "answer": a,
            "status": "completed",
            "created_at": created_at,
        })
        
    return {"doc_id": group_doc_id, "source_doc_ids": selected_doc_ids, "flashcards": saved_cards}

def handle_list_flashcards(user_id: str, doc_id: Optional[str], userstore) -> dict:
    return {"user_id": user_id, "flashcards": userstore.list_flashcards(user_id, doc_id)}

def handle_delete_flashcard(user_id: str, flashcard_id: str, userstore) -> dict:
    userstore.delete_flashcard(user_id, flashcard_id)
    return {"status": "deleted", "flashcard_id": flashcard_id}


QUIZ_PROMPT_TEMPLATE = """You are an exam-quality study assistant. Generate a diverse multiple-choice quiz based on the following text.
Generate exactly {count} questions.
Questions must be UNIQUE and draw from different sections or concepts where possible.
Cover a mix of:
- definition
- concept
- use-case
- comparison
- architecture reasoning
- flow reasoning

Each question must have:
1. "question": string (the query)
2. "options": a list of exactly 4 strings (options)
3. "correct_option": integer (0 to 3 index of correct option in options)
4. "explanation": string explaining why the correct option is correct.

Distractors must be plausible, not random. Randomize the correct option position. Do not use generic repeated wording like "Which statement is supported by the uploaded notes?"
Return ONLY a valid JSON array of objects. Do not include markdown formatting or extra text.

TEXT:
{text}
"""

def handle_generate_quiz(
    user_id: str,
    doc_id: str | None,
    doc_ids: list[str] | None,
    count: int,
    storage,
    userstore,
    ai_client,
) -> dict:
    import json
    import re
    selected_doc_ids = _normalize_doc_ids(doc_id=doc_id, doc_ids=doc_ids)
    group_doc_id = _combined_doc_id(selected_doc_ids)
    selected_docs = _load_selected_docs(user_id, selected_doc_ids, storage, userstore)
    sample_text = _build_combined_prompt_text(selected_docs, total_budget=12000)
    prompt = QUIZ_PROMPT_TEMPLATE.format(count=count, text=sample_text)
    ai_response = ai_client.invoke(prompt, max_tokens=1536)
    
    cleaned = clean_json_response(ai_response)
    try:
        questions = json.loads(cleaned)
        if not isinstance(questions, list):
            if isinstance(questions, dict) and "questions" in questions:
                questions = questions["questions"]
            else:
                raise ValueError("AI response did not parse as a list of questions")
    except Exception as e:
        # simple regex parser fallback
        try:
            # Find JSON objects inside array
            objs = re.findall(r'\{[^{}]*\}', cleaned, re.DOTALL)
            questions = []
            for obj in objs:
                try:
                    q_data = json.loads(obj)
                    if "question" in q_data and "options" in q_data:
                        questions.append(q_data)
                except Exception:
                    pass
        except Exception:
            questions = []
        if not questions:
            raise ValueError(f"Failed to parse AI response: {ai_response}") from e
                
    existing_quizzes = userstore.list_quizzes(user_id, group_doc_id) if hasattr(userstore, "list_quizzes") else []
    for existing_quiz in existing_quizzes:
        quiz_id = existing_quiz.get("id") or existing_quiz.get("quiz_id")
        if quiz_id:
            userstore.delete_quiz_question(user_id, quiz_id)

    saved_quizzes = []
    seen_questions: set[str] = set()
    created_at = _now_iso()
    for idx, q_item in enumerate(questions):
        q_text = q_item.get("question", "Question?")
        normalized_question = re.sub(r"\s+", " ", q_text).strip().lower()
        if normalized_question in seen_questions:
            continue
        seen_questions.add(normalized_question)
        opts = q_item.get("options", ["A", "B", "C", "D"])
        if not isinstance(opts, list):
            opts = ["A", "B", "C", "D"]
        opts = [str(option) for option in opts[:4]]
        while len(opts) < 4:
            opts.append(f"Option {len(opts) + 1}")
        correct = int(q_item.get("correct_option", 0))
        correct = min(max(correct, 0), 3)
        expl = q_item.get("explanation", "No explanation provided.")
        quiz_id = _stable_item_id("quiz", user_id, group_doc_id, idx, q_text)
        
        userstore.add_quiz_question(
            user_id=user_id,
            doc_id=group_doc_id,
            quiz_id=quiz_id,
            question=q_text,
            options=opts,
            correct_option=correct,
            explanation=expl,
        )
        saved_quizzes.append({
            "id": quiz_id,
            "doc_id": group_doc_id,
            "source_doc_ids": selected_doc_ids,
            "question": q_text,
            "options": opts,
            "correct_option": correct,
            "explanation": expl,
            "status": "completed",
            "created_at": created_at,
        })
        
    return {"doc_id": group_doc_id, "source_doc_ids": selected_doc_ids, "quizzes": saved_quizzes}

def handle_list_quizzes(user_id: str, doc_id: Optional[str], userstore) -> dict:
    quizzes = userstore.list_quizzes(user_id, doc_id)
    cleaned = [
        item for item in quizzes
        if "Which statement is supported by the uploaded notes?" not in item.get("question", "")
    ]
    return {"user_id": user_id, "quizzes": cleaned}

def handle_delete_quiz(user_id: str, quiz_id: str, userstore) -> dict:
    userstore.delete_quiz_question(user_id, quiz_id)
    return {"status": "deleted", "quiz_id": quiz_id}
