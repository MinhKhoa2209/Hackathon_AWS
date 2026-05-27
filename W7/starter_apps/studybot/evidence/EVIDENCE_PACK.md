# StudyBot Evidence Pack

## 1. Non-Trivial Extraction Sample

The readiness probes use lecture notes that include table rows, figure captions, equation text, code-like snippets, and slide markers. The current local extractor path is `pypdf` for PDFs and UTF-8 for TXT/MD, so image-only scanned PDFs are a known limitation until the hybrid fallback path is wired.

Implemented hybrid rule:

- Try `pypdf` first for low-cost text PDFs.
- Measure text density as `extracted_characters / page_count`.
- If density is above 100 chars/page, keep the `pypdf` result.
- If density is low and the image ratio is high, mark Claude Vision as the recommended fallback for figure/diagram-heavy slides.
- Otherwise mark Textract as the recommended fallback for scanned/table-heavy PDFs.

Uploads persist `extraction_method`, `confidence_score`, `processing_time`, `fallback_reason`, `text_density`, `image_ratio`, `table_presence`, `scanned`, and `status`.

## 2. Retrieval Quality Measurement

Readiness test: `tests/test_capstone_requirements.py::test_retrieval_quality_precision_at_3_on_probe_questions`.

Probe set:

- What does backpropagation compute?
- What does a confusion matrix compare?
- Why are activation functions used?
- What is overfitting?
- Why does the learning rate matter?

Metric: precision@3 over returned citation snippets. A probe is counted as relevant when one of the top three citations contains the expected concept term. The local threshold is `>= 0.80` so regressions in chunking or search fail quickly.

## 3. Chunking Decision

Current implementation: slide-aware chunking when `Slide N:` markers are present, with sentence-aware fallback around a 700-character target.

Why 700:

- Smaller chunks such as 300 characters often split definitions away from examples or slide context.
- Larger chunks such as 1000+ characters dilute retrieval precision for short student questions.
- Sentence-aware splitting avoids cutting mid-sentence while staying cheap enough for Lambda/local demos.

Next improvement: slide-aware chunking. Slide markers like `Slide 12:` should become metadata so citations can point to a slide number instead of only a chunk number.

## 4. Failure Mode and Mitigation

Failure mode discovered: the query "what is slide 12 about?" can retrieve the wrong chunk when fixed-size chunks cut across slide boundaries or when slide numbers are not preserved as metadata.

Mitigation already present:

- Sentence-boundary chunking avoids mid-sentence cuts.
- Citations return chunk id and snippet so users can inspect grounding.
- Fallback lexical search runs across uploaded documents if the vector store returns no hits.

Mitigation still needed:

- Add slide-aware parsing for PDFs/MD notes.
- Include `slide_number` in chunk metadata and citation cards.
- Add hybrid extraction for low text-density PDFs.
