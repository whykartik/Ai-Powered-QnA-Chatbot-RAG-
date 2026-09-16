import fs from "node:fs/promises"
import path from "node:path"
import Artifact from "./artifact.model.js"
import { parseArtifact } from "./parsers/index.js"
import { chunkDocuments } from "./chunker.js"
import { ragConfig } from "./config.js"
import { deleteDocuments, searchDocuments, upsertDocuments } from "./vectorStore.js"
import { getModel } from "../config/llmModels.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

export const ingestArtifact = async ({ file, userId }) => {
  const sourceFile = file.originalname
  const metadata = { artifact_type: path.extname(sourceFile).slice(1).toLowerCase(), uploaded_at: new Date().toISOString() }
  try {
    const documents = await parseArtifact({ filePath: file.path, sourceFile, metadata })
    const chunks = await chunkDocuments(documents)
    if (!chunks.length) throw new Error("No text could be extracted from the uploaded artifact.")
    const artifact = await Artifact.create({
      userId,
      sourceFile: file.filename,
      originalName: sourceFile,
      artifactType: metadata.artifact_type,
      chunkCount: chunks.length,
      metadata
    })
    try {
      await upsertDocuments({ userId, artifactId: artifact._id, documents: chunks })
    } catch (error) {
      await Artifact.findByIdAndDelete(artifact._id)
      throw error
    }
    return artifact
  } finally {
    await fs.unlink(file.path).catch(() => {})
  }
}

export const listArtifacts = (userId) => Artifact.find({ userId }).sort({ uploadedAt: -1 }).lean()

export const removeArtifact = async ({ userId, artifactId }) => {
  const artifact = await Artifact.findOne({ _id: artifactId, userId })
  if (!artifact) return false
  await deleteDocuments({ userId, artifactId: artifact._id })
  await Artifact.deleteOne({ _id: artifact._id })
  return true
}

export const answerQuery = async ({ userId, query, topK = ragConfig.topK, artifactId }) => {
  const sources = await searchDocuments({ userId, query, topK, artifactId })
  if (!sources.length) return { answer: "I couldn't find relevant information in your uploaded artifacts.", sources: [] }
  const context = sources.map((source, index) => `[${index + 1}] ${source.text}`).join("\n\n")
  const model = await getModel("pdf-rag")
  const response = await model.invoke([
    new SystemMessage("Answer only from the provided context. Cite claims with [1], [2], etc. If the answer is not in context, say you could not find it."),
    new HumanMessage(`Context:\n${context}\n\nQuestion: ${query}`)
  ])
  return {
    answer: response.content,
    sources: sources.map((source, index) => ({
      citation: `[${index + 1}]`,
      text: source.text,
      file: source.metadata.source_file,
      page: source.metadata.page,
      slide: source.metadata.slide,
      sheet: source.metadata.sheet,
      row: source.metadata.row,
      score: source.score
    }))
  }
}
