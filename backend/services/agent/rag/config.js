import "dotenv/config"

export const ragConfig = {
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 500),
  chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP || 50),
  topK: Number(process.env.RAG_TOP_K || 5),
  collectionPrefix: process.env.RAG_COLLECTION_PREFIX || "hershey_rag",
  maxFileSize: Number(process.env.RAG_MAX_FILE_SIZE || 25 * 1024 * 1024),
  ocrEnabled: process.env.RAG_OCR_ENABLED !== "false"
}
