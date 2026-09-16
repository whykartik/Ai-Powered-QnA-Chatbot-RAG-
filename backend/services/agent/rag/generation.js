import { ChatGroq } from "@langchain/groq"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import redis from "../../../shared/redis/redis.js"
import { ragConfig } from "./config.js"
import { searchDocuments } from "./faissStore.js"

const model = new ChatGroq({
  model: ragConfig.groqModel,
  temperature: 0,
  maxTokens: ragConfig.maxOutputTokens
})

const cacheVersion = async (userId) => redis.get(`rag:version:${userId}`) || "0"
const cacheKey = (userId, query, filters, version) => `rag:answer:${userId}:${version}:${Buffer.from(JSON.stringify({ query, filters })).toString("base64url")}`
const promptFor = (query, sources) => [
  new SystemMessage("You are a concise grounded assistant. Answer only from the context. Do not add a preamble. Cite claims with [1], [2], etc. If the context does not answer the question, reply exactly: I couldn't find that in the uploaded artifacts."),
  new HumanMessage(`Context:\n${sources.map((source, index) => `[${index + 1}] ${source.text}`).join("\n\n")}\n\nQuestion: ${query}`)
]

export const invalidateAnswerCache = async (userId) => {
  await redis.incr(`rag:version:${userId}`)
}

export const answerQuery = async ({ userId, query, topK, filters = {} }) => {
  const version = await cacheVersion(userId)
  const key = cacheKey(userId, query, filters, version)
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  const { sources, diagnostics } = await searchDocuments({ userId, query, topK, filters })
  if (!sources.length) return { answer: "I couldn't find that in the uploaded artifacts.", sources: [], diagnostics }
  const response = await model.invoke(promptFor(query, sources))
  const result = { answer: response.content, sources: formatSources(sources), diagnostics }
  await redis.set(key, JSON.stringify(result), "EX", ragConfig.queryCacheTtl)
  return result
}

export const streamAnswer = async ({ userId, query, topK, filters = {}, onToken }) => {
  const version = await cacheVersion(userId)
  const key = cacheKey(userId, query, filters, version)
  const cached = await redis.get(key)
  if (cached) {
    const result = JSON.parse(cached)
    await onToken(result.answer)
    return result
  }
  const { sources, diagnostics } = await searchDocuments({ userId, query, topK, filters })
  if (!sources.length) {
    const result = { answer: "I couldn't find that in the uploaded artifacts.", sources: [], diagnostics }
    await onToken(result.answer)
    return result
  }
  let answer = ""
  const stream = await model.stream(promptFor(query, sources))
  for await (const chunk of stream) {
    const token = typeof chunk.content === "string" ? chunk.content : ""
    if (token) {
      answer += token
      await onToken(token)
    }
  }
  const result = { answer, sources: formatSources(sources), diagnostics }
  await redis.set(key, JSON.stringify(result), "EX", ragConfig.queryCacheTtl)
  return result
}

const formatSources = (sources) => sources.map((source, index) => ({
  citation: `[${index + 1}]`,
  text: source.text,
  file: source.metadata.source_file,
  page: source.metadata.page,
  slide: source.metadata.slide,
  sheet: source.metadata.sheet,
  row: source.metadata.row,
  score: source.score,
  floatScore: source.floatScore,
  binaryDistance: source.binaryDistance
}))
