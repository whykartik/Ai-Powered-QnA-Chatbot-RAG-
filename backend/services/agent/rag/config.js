import "dotenv/config"

export const ragConfig = {
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 400),
  chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP || 50),
  topK: Number(process.env.RAG_TOP_K || 5),
  maxFileSize: Number(process.env.RAG_MAX_FILE_SIZE || 25 * 1024 * 1024),
  ocrEnabled: process.env.RAG_OCR_ENABLED !== "false",
  binaryCandidates: Number(process.env.RAG_BINARY_CANDIDATES || 64),
  embeddingBatchSize: Number(process.env.RAG_EMBEDDING_BATCH_SIZE || 32),
  queryCacheTtl: Number(process.env.RAG_QUERY_CACHE_TTL || 300),
  groqModel: process.env.RAG_GROQ_MODEL || "llama-3.1-8b-instant",
  maxOutputTokens: Number(process.env.RAG_MAX_OUTPUT_TOKENS || 700)
}
