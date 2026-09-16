import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";
import dotenv from "dotenv"
dotenv.config()

export const vectorStore = async (docs, collectionName) => {
    // Binary quantization compresses each float embedding into a 1-bit-per-dimension
    // vector. Qdrant's HNSW graph then walks these binary vectors using Hamming
    // distance (XOR + popcount) instead of float cosine similarity, which is far
    // cheaper to compute — this is what actually improves retrieval latency.
    // Query-time rescoring (see pdfRag.agent.js) re-ranks the top candidates against
    // the original float vectors, so accuracy is preserved.
    const probeVector = await embeddings.embedQuery("dimension probe")

    return await QdrantVectorStore.fromDocuments(docs, embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName,
        collectionConfig: {
            vectors: {
                size: probeVector.length,
                distance: "Cosine"
            },
            quantization_config: {
                binary: {
                    always_ram: true
                }
            }
        }
    });
}