import fs from "node:fs/promises"
import path from "node:path"
import Artifact from "./artifact.model.js"
import { parseArtifact } from "./parsers/index.js"
import { chunkDocuments } from "./chunker.js"
import { deleteDocuments, upsertDocuments } from "./faissStore.js"
import { invalidateAnswerCache } from "./generation.js"

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
      const indexResult = await upsertDocuments({ userId, artifactId: artifact._id, documents: chunks })
      await Artifact.findByIdAndUpdate(artifact._id, { $set: { embeddingStats: indexResult } })
      await invalidateAnswerCache(userId)
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
  await invalidateAnswerCache(userId)
  return true
}
