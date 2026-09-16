import mongoose from "mongoose"

const pdfContextSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  sourceName: { type: String, required: true },
  collectionName: { type: String, required: true },
  chunks: [{
    pageContent: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true })

pdfContextSchema.index({ userId: 1, conversationId: 1 }, { unique: true })

export default mongoose.models.PdfContext || mongoose.model("PdfContext", pdfContextSchema)
