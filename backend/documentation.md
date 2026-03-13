# DeepDocAI Backend and Frontend Extension Notes

## 1. Citation System
The citation system now uses paragraph-level positional metadata stored in the `chunks` table.

### Database shape
`chunks` includes:
- `id`
- `document_id`
- `content`
- `embedding`
- `chunk_type`
- `page_number`
- `bbox JSONB`
- `metadata JSONB`
- `search_vector`

`bbox` is stored in `[x1, y1, x2, y2]` form and represents the paragraph or table region on the source PDF page.

### Ingestion changes
`backend/src/services/layoutChunkingService.js` now creates paragraph-preserving chunks instead of broad merged sections. Each chunk carries:
- `page_number`
- `bbox`
- `page_width`
- `page_height`
- section metadata for retrieval context

`backend/src/services/vector_service.js` persists those values directly into PostgreSQL so retrieval can return citation-ready chunks.

### Citation mapping
`backend/src/services/citationService.js` builds two layers:
- `citations`: the final deduplicated source badges shown for the answer
- `paragraphCitations`: per-paragraph citation groups derived from lexical overlap between answer paragraphs and retrieved chunks

Each citation includes:
```json
{
  "page": 1,
  "bbox": [120, 340, 450, 390],
  "chunkId": "chunk_123",
  "preview": "Validation must reject negative quantities"
}
```

## 2. Streaming Architecture
Streaming is handled through:
- `backend/src/controllers/chat.controller.js`
- `backend/src/services/streamingService.js`
- `frontend/src/components/ChatStream.jsx`

### Backend flow
1. Client calls `GET /api/chat/stream` or the existing `POST /api/ask/stream`.
2. Auth is accepted from either the `Authorization` header or `token` query param for native `EventSource`.
3. The controller creates or reuses the chat, stores the user message, and delegates to `streamingService`.
4. `streamingService` sets SSE headers and starts `generateAnswerStream`.
5. Token chunks are emitted as standard SSE `data:` messages.
6. Citation metadata is emitted as:
```text
event: citations
data: { ... }
```
7. Final answer metadata is emitted as:
```text
event: complete
data: { ... }
```
8. Completion is closed with:
```text
event: done
data: { "ok": true }
```

### Frontend flow
`frontend/src/components/Workspace.jsx` creates an `activeStream` request object. `frontend/src/components/ChatStream.jsx` opens a native `EventSource` and forwards:
- token events to the active AI message
- citation payloads to answer badges
- completion payloads to final answer state

This keeps answer text progressive while still attaching final citations and table payloads at the end.

## 3. PDF Highlight Algorithm
PDF navigation and highlighting are handled by:
- `frontend/src/components/PDFViewer.jsx`
- `frontend/src/components/HighlightOverlay.jsx`

When a citation badge is clicked, `Workspace.jsx` stores the citation as `activeHighlight`. The viewer automatically jumps to `activeHighlight.page`.

Highlight positioning uses:
```text
scaleX = viewportWidth / pageWidth
scaleY = viewportHeight / pageHeight

left = x1 * scaleX
top = y1 * scaleY
width = (x2 - x1) * scaleX
height = (y2 - y1) * scaleY
```

The overlay is rendered above the PDF page with:
```css
background: rgba(255,255,0,0.4);
```

## 4. Logging System
Structured logging is centralized in `backend/src/utils/logger.js`.

The logger emits timestamps plus stage labels. The main flow now logs:
- `[CHAT REQUEST] Query received`
- `[RETRIEVAL] Hybrid retrieval started`
- `[VECTOR SEARCH] Vector search completed`
- `[KEYWORD SEARCH] Keyword search completed`
- `[RERANK] Hybrid rerank completed`
- `[LLM] Streaming started`
- `[TOKEN STREAM] Token emitted`
- `[CITATION MAP] Citation mapped`
- `[STREAM COMPLETE] Streaming finished`

Ingestion logs were also normalized so document processing stages are easier to trace in production.

## 5. Error Handling
Try/catch handling now wraps:
- chat request initialization
- retrieval
- vector storage
- streaming orchestration
- document ingestion
- frontend highlight rendering

Representative error logs include:
- `[ERROR][STREAM] Streaming connection closed`
- `[ERROR][RETRIEVAL] Hybrid retrieval failed`
- `[ERROR][PDF] Highlight rendering error`
- `[ERROR][INGESTION] Document processing failed`

Errors return JSON or SSE `error` events without crashing the API process.

## 6. System Data Flow
The updated end-to-end path is:

1. User uploads PDF.
2. OCR runs through Sarvam.
3. `layoutChunkingService` creates paragraph-aware chunks with bbox metadata.
4. Embeddings and search vectors are stored in PostgreSQL/pgvector.
5. User asks a question.
6. Chat controller logs the request and starts streaming.
7. Retrieval generates the query embedding and runs hybrid search.
8. Top chunks are sent to the LLM.
9. Tokens stream to the UI progressively.
10. Final citations and paragraph citation groups are emitted.
11. `AnswerCard` renders citation badges.
12. Clicking a badge navigates the PDF and highlights the cited paragraph.

## 7. Frontend Components Added
The UI additions are:
- `frontend/src/components/ChatStream.jsx`
- `frontend/src/components/AnswerCard.jsx`
- `frontend/src/components/CitationBadge.jsx`
- `frontend/src/components/PDFViewer.jsx`
- `frontend/src/components/HighlightOverlay.jsx`

Note: on this Windows workspace the repository already used `PDFViewer.jsx`, so the PDF viewer implementation remains in that file while still serving the requested viewer role.
