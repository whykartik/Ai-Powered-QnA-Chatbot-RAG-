# RAG module

This module adds artifact ingestion and retrieval without changing the existing agent graph.

## Endpoints

The agent service exposes these routes under `/rag` (the gateway exposes them under `/api/agent/rag`):

- `POST /artifacts/upload` with multipart field `file` for PDF, PPTX, XLSX, or CSV.
- `GET /artifacts` lists the authenticated user's artifacts.
- `DELETE /artifacts/:id` removes the artifact record and its Qdrant vectors.
- `POST /query` with `{ "query": "...", "topK": 5, "artifactId": "optional-id" }` returns an answer and citations.

## Environment

The module reuses `MONGODB_URI`, `QDRANT_URL`, `QDRANT_API_KEY`, and `GOOGLE_API_KEY`. Optional settings are:

```env
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50
RAG_TOP_K=5
RAG_COLLECTION_PREFIX=hershey_rag
RAG_MAX_FILE_SIZE=26214400
RAG_OCR_ENABLED=true
```

Run tests with `npm test` from `backend/services/agent`.

## Example

```sh
curl -X POST https://<gateway>/api/agent/rag/artifacts/upload \
  -H "Cookie: session=<session>" \
  -F "file=@./sample.pdf"

curl -X POST https://<gateway>/api/agent/rag/query \
  -H "Cookie: session=<session>" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the main conclusion?"}'
```
