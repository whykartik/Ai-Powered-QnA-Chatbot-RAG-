# RAG module

This module adds artifact ingestion and retrieval without changing the existing agent graph.

## Endpoints

The agent service exposes these routes under `/rag` (the gateway exposes them under `/api/agent/rag`):

- `POST /artifacts/upload` with multipart field `file` for PDF, PPTX, XLSX, or CSV.
- `GET /artifacts` lists the authenticated user's artifacts.
- `DELETE /artifacts/:id` removes the artifact record and its Qdrant vectors.
- `POST /query` with `{ "query": "...", "topK": 5, "filters": { "source_file": "optional-name" } }` returns an answer and citations.

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

## Low-latency retrieval path

The production query path uses two stages:

1. Chunk content is SHA-256 hashed. Existing hashes reuse their stored embeddings.
2. Gemini embeddings are requested in batches with retry backoff.
3. Each vector is stored as full float values and packed sign bits.
4. A cached per-user FAISS `IndexFlatIP` reranks float vectors. Packed sign bits provide the first-stage Hamming candidate search because the available Node FAISS binding does not expose `IndexBinaryFlat`.
5. Keyword scoring is merged with semantic rank using reciprocal rank fusion.
6. Only the final top-k chunks are sent to Groq.
7. Repeated answers are cached in Redis and invalidated after ingestion or deletion.

The streaming endpoint is:

```text
POST /api/agent/rag/query/stream
```

It emits `token`, `sources`, `done`, and `error` SSE events. The React component [RagChat.jsx](../../../frontend/src/components/RagChat.jsx) consumes the stream.

## Configuration

```env
RAG_CHUNK_SIZE=400
RAG_CHUNK_OVERLAP=50
RAG_BINARY_CANDIDATES=64
RAG_TOP_K=5
RAG_EMBEDDING_BATCH_SIZE=32
RAG_QUERY_CACHE_TTL=300
RAG_GROQ_MODEL=llama-3.1-8b-instant
RAG_MAX_OUTPUT_TOKENS=700
```

Run the retrieval overlap evaluation against an existing user namespace:

```sh
RAG_EVAL_USER_ID=<user-id> npm run rag:eval
```

The output reports `binaryFloatOverlap` and `finalFloatOverlap` for each query.
