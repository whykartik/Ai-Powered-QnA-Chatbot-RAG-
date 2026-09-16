import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";
import dotenv from "dotenv"
import crypto from "node:crypto"
dotenv.config()

const { QdrantClient } = await import("@qdrant/js-client-rest")
const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY || undefined
})

export const pdfCollectionName = (userId, conversationId) => {
    const value = `${userId}:${conversationId}`
    return `pdf-${crypto.createHash("sha256").update(value).digest("hex").slice(0, 32)}`
}

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

export const existingVectorStore = async (collectionName) => {
    return new QdrantVectorStore(embeddings, {
        client,
        collectionName
    })
}

export const deleteVectorStore = async (collectionName) => {
    if (!collectionName) return
    try {
        await client.deleteCollection(collectionName)
    } catch (error) {
        if (!String(error?.message).toLowerCase().includes("not found")) throw error
    }
}