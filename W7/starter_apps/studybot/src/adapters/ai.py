"""AI adapters. Pick via AI_BACKEND env var.

Interface:
    invoke(prompt, **kwargs) -> str
    retrieve_and_generate(query, kb_id="") -> dict with {"answer": str, "citations": list}
"""
import logging
from typing import Any
import hashlib
import json
import random
import re

logger = logging.getLogger(__name__)


class BedrockAI:
    """Real Amazon Bedrock client. Uses Converse API for invoke; bedrock-agent-runtime for RAG."""

    def __init__(self, region: str, model_id: str, model_arn: str = ""):
        import boto3
        from botocore.config import Config
        self.region = region
        self.model_id = model_id
        self.model_arn = model_arn or f"arn:aws:bedrock:{self.region}::foundation-model/{self.model_id}"
        client_config = Config(
            connect_timeout=2,
            read_timeout=10,
            retries={"max_attempts": 1, "mode": "standard"},
        )
        self.runtime = boto3.client("bedrock-runtime", region_name=region, config=client_config)
        self.agent_runtime = boto3.client("bedrock-agent-runtime", region_name=region, config=client_config)
        self.fallback_model_ids = [
            "amazon.nova-lite-v1:0",
            "amazon.nova-micro-v1:0",
        ]

    def _fallback_model_arn(self, model_id: str) -> str:
        return f"arn:aws:bedrock:{self.region}::foundation-model/{model_id}"

    def _model_candidates(self) -> list[tuple[str, str]]:
        candidates = [(self.model_id, self.model_arn)]
        seen = {self.model_id}
        for model_id in self.fallback_model_ids:
            if model_id in seen:
                continue
            candidates.append((model_id, self._fallback_model_arn(model_id)))
            seen.add(model_id)
        return candidates

    def invoke(self, prompt: str, **kwargs: Any) -> str:
        max_tokens = kwargs.get("max_tokens", 1024)
        last_exc: Exception | None = None
        for model_id, _ in self._model_candidates():
            try:
                resp = self.runtime.converse(
                    modelId=model_id,
                    messages=[{"role": "user", "content": [{"text": prompt}]}],
                    inferenceConfig={"maxTokens": max_tokens, "temperature": kwargs.get("temperature", 0.2)},
                )
                if model_id != self.model_id:
                    logger.warning("Bedrock invoke fell back from %s to %s", self.model_id, model_id)
                return resp["output"]["message"]["content"][0]["text"]
            except Exception as exc:
                last_exc = exc
                logger.warning("Bedrock invoke failed on %s: %s", model_id, exc)
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("No Bedrock model candidates configured")

    def retrieve_and_generate(self, query: str, kb_id: str = "") -> dict:
        if not kb_id:
            raise ValueError("VECTOR_BEDROCK_KB_ID must be set for Bedrock KB retrieve_and_generate")
        last_exc: Exception | None = None
        for model_id, model_arn in self._model_candidates():
            try:
                resp = self.agent_runtime.retrieve_and_generate(
                    input={"text": query},
                    retrieveAndGenerateConfiguration={
                        "type": "KNOWLEDGE_BASE",
                        "knowledgeBaseConfiguration": {
                            "knowledgeBaseId": kb_id,
                            "modelArn": model_arn,
                        },
                    },
                )
                if model_id != self.model_id:
                    logger.warning("Bedrock RAG fell back from %s to %s", self.model_id, model_id)
                return {
                    "answer": resp["output"]["text"],
                    "citations": [
                        {
                            "text": ref.get("content", {}).get("text", ""),
                            "source": ref.get("location", {}),
                        }
                        for citation in resp.get("citations", [])
                        for ref in citation.get("retrievedReferences", [])
                    ],
                }
            except Exception as exc:
                last_exc = exc
                logger.warning("Bedrock RAG failed on %s: %s", model_id, exc)
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("No Bedrock model candidates configured")


class LocalAI:
    """Local deterministic assistant. Good enough for demos before Bedrock is deployed."""

    def invoke(self, prompt: str, **kwargs: Any) -> str:
        if '"testable_concepts"' in prompt:
            return self._summary(prompt)
        if '"question"' in prompt and '"answer"' in prompt:
            return self._flashcards(prompt)
        if '"options"' in prompt and '"correct_option"' in prompt:
            return self._quiz(prompt)
        return self._grounded_answer(prompt)

    def retrieve_and_generate(self, query: str, kb_id: str = "") -> dict:
        return {
            "answer": (
                "I can answer after the deployed Bedrock Knowledge Base has ingested this document. "
                "For local development, use VECTOR_BACKEND=local so the app can search uploaded content in-process."
            ),
            "citations": [],
        }

    @staticmethod
    def _clean_context(text: str) -> str:
        text = re.sub(r"\[chunk\s+\d+\]", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"^\s*#{1,6}\s+.*$", " ", text, flags=re.MULTILINE)
        text = re.sub(r"^\s*_?Source:\s*.*$", " ", text, flags=re.IGNORECASE | re.MULTILINE)
        text = re.sub(r"^\s*_?URL:\s*.*$", " ", text, flags=re.IGNORECASE | re.MULTILINE)
        text = re.sub(r"StudyBot W7 sample lecture PDF\s*\|\s*page\s+\d+\s+of\s+\d+", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"\bSlide\s+\d+\s*:\s*", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+-\s+", ". ", text)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def _extract_context(prompt: str) -> str:
        match = re.search(r"(?:CONTEXT|Retrieved Context):\s*(.*?)\s*(?:QUESTION|Question):", prompt, re.DOTALL | re.IGNORECASE)
        if match:
            return LocalAI._clean_context(match.group(1).strip())
        text_match = re.search(r"TEXT:\s*(.*)", prompt, re.DOTALL)
        return LocalAI._clean_context(text_match.group(1).strip() if text_match else prompt)

    @staticmethod
    def _extract_question(prompt: str) -> str:
        match = re.search(r"(?:QUESTION|Question):\s*(.*?)\s*(?:ANSWER:|Return ONLY valid JSON)", prompt, re.DOTALL)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _extract_count(prompt: str, default: int) -> int:
        match = re.search(r"Generate exactly\s+(\d+)", prompt, re.IGNORECASE)
        return int(match.group(1)) if match else default

    @staticmethod
    def _sentences(text: str) -> list[str]:
        cleaned = LocalAI._clean_context(text)
        return [
            s.strip(" -")
            for s in re.split(r"(?<=[.!?])\s+", cleaned)
            if len(s.strip()) > 35 and len(s.strip().split()) >= 6
        ]

    def _grounded_answer(self, prompt: str) -> str:
        import json

        context = self._extract_context(prompt)
        question = self._extract_question(prompt)
        stop = {"what", "does", "why", "how", "when", "where", "which", "about", "topic", "is", "are", "the"}
        q_tokens = {t.lower() for t in re.findall(r"\w+", question) if len(t) > 2 and t.lower() not in stop}
        ranked = []
        for sentence in self._sentences(context):
            tokens = re.findall(r"\w+", sentence.lower())
            score = sum(1 for token in tokens if token in q_tokens)
            if len(sentence.split()) < 8:
                score -= 2
            ranked.append((score, sentence))
        ranked.sort(key=lambda item: item[0], reverse=True)
        selected = [sentence for score, sentence in ranked if score > 0][:2] or [s for _, s in ranked[:2]]
        if not selected:
            return json.dumps({"answer": "I couldn't find enough grounded information in the uploaded documents."})
        answer = " ".join(selected)
        answer = re.sub(r"\[chunk\s+\d+\]", "", answer, flags=re.IGNORECASE)
        answer = re.sub(r"_?Source:\s*.*", "", answer, flags=re.IGNORECASE)
        answer = re.sub(r"_?URL:\s*\S+", "", answer, flags=re.IGNORECASE)
        if len(answer.split()) < 8:
            answer = "I couldn't find enough grounded information in the uploaded documents."
        return json.dumps({"answer": answer.strip()})

    def _flashcards(self, prompt: str) -> str:
        import json

        count = self._extract_count(prompt, 5)
        context = self._extract_context(prompt)
        sentences = self._sentences(context)[:5] or ["This document introduces the uploaded study topic."]
        while len(sentences) < count:
            sentences.append(sentences[len(sentences) % max(1, len(sentences))])
        cards = [
            {
                "question": f"What is key idea {idx + 1} from the uploaded notes?",
                "answer": sentence,
            }
            for idx, sentence in enumerate(sentences[:count])
        ]
        return json.dumps(cards)

    def _quiz(self, prompt: str) -> str:
        count = self._extract_count(prompt, 5)
        context = self._extract_context(prompt)
        sentences = self._sentences(context) or ["This document introduces the uploaded study topic."]
        concepts = []
        seen = set()
        for sentence in sentences:
            words = [w for w in re.findall(r"[A-Za-z][A-Za-z0-9-]{3,}", sentence) if w.lower() not in {"slide", "this", "that", "with", "from"}]
            concept = " ".join(words[:4]) or f"concept {len(concepts) + 1}"
            key = concept.lower()
            if key not in seen:
                seen.add(key)
                concepts.append((concept, sentence))
            if len(concepts) >= max(count, 10):
                break
        while len(concepts) < count:
            concepts.append((f"study concept {len(concepts) + 1}", sentences[len(concepts) % len(sentences)]))

        templates = [
            ("definition", "What best defines {concept}?", "{sentence}"),
            ("concept", "Which idea is most closely associated with {concept}?", "{sentence}"),
            ("use-case", "When would {concept} be most useful?", "When the goal is to apply this lecture idea: {sentence}"),
            ("comparison", "What distinguishes {concept} from a weaker alternative?", "It preserves the lecture tradeoff: {sentence}"),
            ("architecture reasoning", "Why does the architecture rely on {concept}?", "Because this decision supports the system behavior described here: {sentence}"),
            ("flow reasoning", "Where does {concept} fit in the learning flow?", "It participates in the flow described here: {sentence}"),
        ]
        distractors = [
            "It should be skipped because it does not affect learning outcomes.",
            "It mainly replaces the need for grounding or evaluation.",
            "It is useful only when no uploaded material exists.",
            "It always increases accuracy without any cost or latency tradeoff.",
            "It is unrelated to retrieval, extraction, or study workflow quality.",
        ]
        rng = random.Random(hashlib.sha256(context.encode("utf-8", errors="ignore")).hexdigest())
        questions = []
        used_questions = set()
        for idx, (concept, sentence) in enumerate(concepts[:count]):
            q_type, q_text, answer_text = templates[idx % len(templates)]
            question = q_text.format(concept=concept)
            if question.lower() in used_questions:
                question = f"{question} ({q_type})"
            used_questions.add(question.lower())
            correct = answer_text.format(sentence=sentence[:170])
            wrong = rng.sample(distractors, 3)
            options = [correct, *wrong]
            rng.shuffle(options)
            questions.append({
                "question": question,
                "options": options,
                "correct_option": options.index(correct),
                "explanation": f"This is a {q_type} question grounded in a distinct lecture concept.",
            })
        return json.dumps(questions)

    def _summary(self, prompt: str) -> str:
        context = self._extract_context(prompt)
        sentences = self._sentences(context)
        lower = context.lower()
        facts = []
        if "pypdf" in lower or "textract" in lower or "density" in lower:
            facts.append("The extraction design uses a low-cost first pass before recommending OCR or vision fallback when density or image signals justify it.")
        if "chunk" in lower or "retriev" in lower:
            facts.append("The retrieval design depends on chunking choices: slide-aware chunks improve precision, while oversized chunks dilute relevance.")
        if "precision@3" in lower or "probe" in lower:
            facts.append("Retrieval quality is measured with probe questions and precision@3 instead of relying on subjective demo impressions.")
        if "citation" in lower or "ground" in lower:
            facts.append("Grounded answers are constrained to uploaded notes so students can trust the response without exposing retrieval internals.")
        if "cost" in lower or "latency" in lower:
            facts.append("The architecture treats cost and latency as design constraints, reserving expensive extraction paths for documents that need them.")
        if not facts:
            facts = sentences[:3] or ["The material describes a study workflow that turns uploaded notes into grounded review artifacts."]

        concept_bank = [
            ("Hybrid extraction routing", "It tests the tradeoff between cheap text extraction and expensive OCR or vision fallback."),
            ("Slide-aware chunking", "It tests whether retrieval units match how students ask questions about lecture slides."),
            ("Measured retrieval quality", "It tests engineering rigor through precision@k probes instead of anecdotal quality checks."),
            ("Grounded answer constraints", "It tests whether the assistant can synthesize answers without exposing chunk metadata or unsupported facts."),
            ("Cost and latency optimization", "It tests whether architecture choices are justified by performance and budget constraints."),
        ]
        concepts = [{"concept": concept, "why_testable": why} for concept, why in concept_bank]
        return json.dumps({
            "summary": " ".join(facts[:4]),
            "testable_concepts": concepts,
        })
