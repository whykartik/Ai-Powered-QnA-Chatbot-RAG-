import mongoose from "mongoose"

const chunkSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  artifactIds: [{ type: mongoose.Schema.Types.ObjectId, required: true, index: true }],
  contentHash: { type: String, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  binaryEmbedding: { type: Buffer, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

chunkSchema.index({ userId: 1, contentHash: 1 })

export default mongoose.models.RagChunk || mongoose.model("RagChunk", chunkSchema)
