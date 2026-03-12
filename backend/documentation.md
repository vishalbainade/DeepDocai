# Document Ingestion & RAG Architecture
DeepDoc AI0 Backend Documentation

---

## 1. System Architecture
The DeepDoc AI0 backend is an Express Node.js application built to facilitate state-of-the-art Document Retrieval Augmented Generation (RAG).

**Core Technologies:**
- **Storage:** Supabase Object Storage (`file-inputs`)
- **Database:** PostgreSQL with `pgvector` for Cosine similarity and `tsvector` for Full-Text Search
- **OCR Engine:** Sarvam AI Document Intelligence API (hi-IN / English models)
- **PDF Generation:** `pdf-lib` + `@pdf-lib/fontkit`
- **LLM Wrapper:** Google Generative AI (`gemini-2.5-flash`)

---

## 2. Document Ingestion Pipeline
When a user uploads a PDF, it is processed through a strict 7-step orchestration defined in `src/controllers/document.controller.js`.

### Pipeline Execution
1. **[UPLOAD]** Download the original static PDF from the Supabase `file-inputs/original` bucket.
2. **[OCR]** Transport the temporary file to Sarvam with exponential backoff retries. Returns unstructured markdown strings and rich `ocrMetadataPages` containing specific Layout Block structures (`title`, `table`, `paragraph`).
3. **[PDF RECONSTRUCTION]** Discards the raw scanned image and uses `documentReconstructionService.js` to build a clean, pure white digital A4 PDF. 
   - Uses `utils/layoutParser.js` to order blocks chronologically.
   - Uses `utils/pdfRenderer.js` to paginate and type-set fonts according to bounds.
4. **[STORAGE]** Uploads the pure digital PDF back to Supabase as `ocr-...` enabling the React Frontend to stream crisp selectable data.
5. **[CHUNKING]** Translates the metadata bounds through `layoutChunkingService.js`:
   - Tables are kept entirely intact as singular chunks.
   - Text paragraphs are accumulated safely under a strict ~300 max token `tokenizer.js` constraint boundary.
6. **[EMBEDDING]** `text-embedding-004` applies pure semantic 768-D coordinates to each constructed text.
7. **[DB INSERT]** The mapped items are mounted into the `chunks` DB table, associating vectors, bounds, and layout types securely. `search_vector` is computed securely via `GENERATED ALWAYS AS tsvector`.

---

## 3. Hybrid RAG Retrieval Flow
Requests originating from the `chat.controller.js` flow into `rag_service.js`.

### Query Classification
The RAG intent parser determines if a query is:
- **Table Specific:** Drops the query limits and pulls *all* table-registered chunks from the DB and pushes it toward a heavy tabular Map/Reduce Gemini summarizer `buildTableAnswer`.
- **Generic (Summarization):** Bypasses semantic matches and provides an arbitrarily chronologically ordered subset of text.
- **Specific (Default):** Runs through `retrievalService.hybridSearch`.

### Hybrid Search Execution (`retrievalService.js`)
To provide extreme accuracy to queries, `hybridSearch` maps against two disparate ranking models simultaneously:

1. **Vector Embeddings (Top 10):** Matches the core meaning/semantics of a phrase leveraging `pgvector` cosine difference `embedding <=> $1`.
2. **Keyword Embeddings (Top 10):** Matches exact linguistic terms leveraging ultra-fast Native PG GIN index indexing over `websearch_to_tsquery`.

**Merger Algorithm:**
The two array datasets are blended together through the `utils/rrf.js` Reciprocal Rank Fusion component prioritizing results that appear independently high-ranked in *both* retrieval methodologies. Fallbacks immediately fire if the subset intersection drops below 3 results.

---

## 4. Logging & Error Governance
To protect the lengthy ingestion cycle, every sequence boundary outputs explicitly marked brackets:
- `[UPLOAD] Processing document ...`
- `[OCR] Sarvam Extracted 83 Pages ...`
- `[LAYOUT PARSER] Breakdown: { paragraph: 60, heading: 4 ... }`
- `[RENDER BLOCK] Type: heading | Pg 1 ...` 
- `[PDF COMPLETE] Pages: 85 ...`
- `[CHUNKING] Section chunks: 140 ...`
- `[RETRIEVAL] Matches: 6 | Time: 42ms ...`

All failures are natively trapped and propagate a `'failed'` hook back to the `documents.status` database column ensuring the React UI accurately displays execution failures without hanging. The Sarvam integration specifically features automatic exponentiating retries against sporadic Network timeouts.
