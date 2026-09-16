import mongoose from "mongoose"

const artifactSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sourceFile: { type: String, required: true },
  originalName: { type: String, required: true },
  artifactType: { type: String, required: true },
  chunkCount: { type: Number, default: 0 },
  embeddingStats: { type: mongoose.Schema.Types.Mixed, default: {} },
  uploadedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

export default mongoose.models.RagArtifact || mongoose.model("RagArtifact", artifactSchema)
