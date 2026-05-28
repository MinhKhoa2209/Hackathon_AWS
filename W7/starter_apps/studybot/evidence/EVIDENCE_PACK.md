# Evidence Pack

This evidence pack records the main engineering gaps and validation points for the StudyBot demo.

## Known Findings

- Non-trivial extraction: PDF handling is not a single-path problem. We use text density and image ratio to decide whether `pypdf` is enough or whether OCR/vision fallback should be recommended.
- Precision@3: retrieval quality is measured with probe questions and precision@3 rather than only relying on a subjective UI demo.
- Chunking decision: the current chunker keeps sentence boundaries and prefers slide-aware sections when `Slide N` markers are present.
- Failure mode: Bedrock Knowledge Base ingestion can be throttled or blocked by model permissions, so uploads must not fail hard when ingestion cannot start.
- Text density: low text density is used as a signal that plain PDF extraction may be weak and that fallback extraction paths are justified.
- Slide-aware retrieval: slide-aware chunking improves grounding for lecture-style material and helps preserve local context for quiz and flashcard generation.

## Operational Note

The current AWS account can run storage, DynamoDB, and the API stack, but model generation and KB ingestion may degrade because of Bedrock access limits or throttling. The backend now falls back cleanly so the app remains usable.
