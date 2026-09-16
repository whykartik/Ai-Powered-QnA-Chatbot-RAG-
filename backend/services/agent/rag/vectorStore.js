import crypto from "node:crypto"
import { QdrantClient } from "@qdrant/js-client-rest"
import { ragConfig } from "./config.js"
import { embedDocuments, embedQuery } from "./embedder.js"

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || undefined
})

const namespaceCollection = (userId) => `${ragConfig.collectionPrefix}_${crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0, 24)}`

const ensureCollection = async (collection, vectorSize) => {
  const collections = await client.getCollections()
  if (!collections.collections.some((item) => item.name === collection)) {
    await client.createCollection(collection, {
      vectors: { size: vectorSize, distance: "Cosine" }
    })
  }
}

export const upsertDocuments = async ({ userId, artifactId, documents }) => {
  if (!documents.length) return { collection: namespaceCollection(userId), count: 0 }
  const collection = namespaceCollection(userId)
  const vectors = await embedDocuments(documents.map((document) => document.text))
  await ensureCollection(collection, vectors[0].length)
  const points = documents.map((document, index) => ({
    id: crypto.randomUUID(),
    vector: vectors[index],
    payload: {
      artifact_id: String(artifactId),
      text: document.text,
      ...document.metadata
    }
  }))
  await client.upsert(collection, { wait: true, points })
  return { collection, count: points.length }
}

export const deleteDocuments = async ({ userId, artifactId }) => {
  const collection = namespaceCollection(userId)
  const collections = await client.getCollections()
  if (!collections.collections.some((item) => item.name === collection)) return
  await client.delete(collection, {
    wait: true,
    filter: { must: [{ key: "artifact_id", match: { value: String(artifactId) } }] }
  })
}

export const searchDocuments = async ({ userId, query, topK, artifactId }) => {
  const collection = namespaceCollection(userId)
  const collections = await client.getCollections()
  if (!collections.collections.some((item) => item.name === collection)) return []
  const vector = await embedQuery(query)
  const filter = artifactId ? { must: [{ key: "artifact_id", match: { value: String(artifactId) } }] } : undefined
  const result = await client.query(collection, {
    query: vector,
    limit: topK,
    filter,
    with_payload: true
  })
  return result.points.map((point) => ({
    score: point.score,
    text: point.payload.text,
    metadata: point.payload
  }))
}

export const listVectorDocuments = async ({ userId }) => ({ collection: namespaceCollection(userId) })
