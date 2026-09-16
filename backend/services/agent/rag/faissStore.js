import crypto from "node:crypto"
import faiss from "faiss-node"
import Chunk from "./chunk.model.js"
import { ragConfig } from "./config.js"
import { embedDocuments, embedQuery } from "./embedder.js"

const indexes = new Map()
const { IndexFlatIP } = faiss
const popcount = new Uint8Array(256)
for (let value = 1; value < 256; value += 1) popcount[value] = popcount[value >> 1] + (value & 1)

const hash = (text) => crypto.createHash("sha256").update(text).digest("hex")
const packBinary = (vector) => {
  const packed = Buffer.alloc(Math.ceil(vector.length / 8))
  vector.forEach((value, index) => {
    if (value >= 0) packed[index >> 3] |= 1 << (index & 7)
  })
  return packed
}
const hamming = (left, right) => {
  let distance = 0
  for (let index = 0; index < left.length; index += 1) distance += popcount[left[index] ^ right[index]]
  return distance
}
const normalize = (vector) => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

const loadIndex = async (userId) => {
  const key = String(userId)
  if (indexes.has(key)) return indexes.get(key)
  const chunks = await Chunk.find({ userId }).lean()
  const dimension = chunks[0]?.embedding?.length || 0
  const floatIndex = dimension ? new IndexFlatIP(dimension) : null
  if (floatIndex) floatIndex.add(chunks.flatMap((chunk) => normalize(chunk.embedding)))
  const state = { chunks, floatIndex, dimension }
  indexes.set(key, state)
  return state
}

export const invalidateIndex = (userId) => indexes.delete(String(userId))

export const upsertDocuments = async ({ userId, artifactId, documents }) => {
  if (!documents.length) return { count: 0, embedded: 0, reused: 0 }
  const hashes = documents.map((document) => hash(document.text))
  const existing = await Chunk.find({ userId, contentHash: { $in: hashes } }).lean()
  const existingByHash = new Map(existing.map((chunk) => [chunk.contentHash, chunk]))
  const missing = documents.filter((document) => !existingByHash.has(hash(document.text)))
  const vectors = missing.length ? await embedDocuments(missing.map((document) => document.text), ragConfig.embeddingBatchSize) : []
  const newRecords = documents.filter((document) => !existingByHash.has(hash(document.text))).map((document, index) => {
    const contentHash = hash(document.text)
    const embedding = vectors[index]
    return {
      userId,
      artifactIds: [artifactId],
      contentHash,
      text: document.text,
      embedding,
      binaryEmbedding: packBinary(embedding),
      metadata: document.metadata
    }
  })
  if (newRecords.length) await Chunk.insertMany(newRecords)
  await Promise.all(existing.map((chunk) => Chunk.updateOne(
    { _id: chunk._id },
    { $addToSet: { artifactIds: artifactId } }
  )))
  invalidateIndex(userId)
  return { count: documents.length, embedded: missing.length, reused: documents.length - missing.length }
}

export const deleteDocuments = async ({ userId, artifactId }) => {
  const chunks = await Chunk.find({ userId, artifactIds: artifactId }, { _id: 1 }).lean()
  await Chunk.updateMany({ userId, artifactIds: artifactId }, { $pull: { artifactIds: artifactId } })
  await Chunk.deleteMany({ _id: { $in: chunks.map((chunk) => chunk._id) }, artifactIds: { $size: 0 } })
  invalidateIndex(userId)
}

const matchesFilters = (metadata, filters = {}) => Object.entries(filters).every(([key, value]) => {
  if (Array.isArray(value)) return value.includes(metadata[key])
  return metadata[key] === value
})

const keywordScore = (query, text) => {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean)
  const lower = text.toLowerCase()
  return terms.reduce((score, term) => score + (lower.match(new RegExp(`\\b${term}\\b`, "g")) || []).length, 0)
}

export const searchDocuments = async ({ userId, query, topK = ragConfig.topK, filters = {} }) => {
  const [state, queryEmbedding] = await Promise.all([loadIndex(userId), embedQuery(query)])
  if (!state.chunks.length) return { sources: [], diagnostics: { binaryCandidates: 0, floatOverlap: 0 } }
  const normalizedQuery = normalize(queryEmbedding)
  const queryBinary = packBinary(normalizedQuery)
  const allowed = state.chunks.map((chunk, index) => ({ chunk, index })).filter(({ chunk }) => matchesFilters(chunk.metadata, filters))
  const binaryRanked = allowed.map(({ chunk, index }) => ({ chunk, index, binaryDistance: hamming(queryBinary, chunk.binaryEmbedding) }))
    .sort((left, right) => left.binaryDistance - right.binaryDistance)
    .slice(0, ragConfig.binaryCandidates)
  const faissResult = state.floatIndex && !Object.keys(filters).length
    ? state.floatIndex.search(normalizedQuery, Math.min(state.chunks.length, ragConfig.binaryCandidates))
    : null
  const faissScores = new Map((faissResult?.labels || []).map((label, index) => [label, faissResult.distances[index]]))
  const candidates = binaryRanked.map(({ chunk, index, binaryDistance }) => ({
    chunk,
    index,
    binaryDistance,
    floatScore: faissScores.get(index) ?? normalize(chunk.embedding).reduce((sum, value, dimension) => sum + value * normalizedQuery[dimension], 0)
  }))
  const floatRanked = candidates.sort((left, right) => right.floatScore - left.floatScore)
  const keywordRanked = allowed.map(({ chunk, index }) => ({ chunk, index, keywordScore: keywordScore(query, chunk.text) }))
    .sort((left, right) => right.keywordScore - left.keywordScore)
  const rankMap = new Map()
  const addRank = (item, rank) => rankMap.set(item.index, (rankMap.get(item.index) || 0) + 1 / (60 + rank))
  floatRanked.forEach(addRank)
  keywordRanked.forEach(addRank)
  const sources = [...rankMap.entries()].sort((left, right) => right[1] - left[1]).slice(0, topK).map(([index, fusionScore]) => ({
    text: state.chunks[index].text,
    metadata: state.chunks[index].metadata,
    score: fusionScore,
    floatScore: candidates.find((item) => item.index === index)?.floatScore,
    binaryDistance: candidates.find((item) => item.index === index)?.binaryDistance
  }))
  const floatTop = floatRanked.slice(0, topK).map((item) => item.index)
  const finalIndexes = sources.map((source) => state.chunks.findIndex((chunk) => chunk.text === source.text && chunk.metadata?.chunk_index === source.metadata?.chunk_index))
  const binaryIndexes = new Set(binaryRanked.map((item) => item.index))
  return { sources, diagnostics: {
    binaryCandidates: binaryRanked.length,
    binaryFloatOverlap: floatTop.filter((index) => binaryIndexes.has(index)).length / Math.max(1, floatTop.length),
    finalFloatOverlap: finalIndexes.filter((index) => floatTop.includes(index)).length / Math.max(1, topK)
  } }
}

export const getChunkHash = hash
export const getCachedIndexInfo = async (userId) => {
  const state = await loadIndex(userId)
  return { chunks: state.chunks.length, dimension: state.dimension, faissIndex: Boolean(state.floatIndex) }
}
