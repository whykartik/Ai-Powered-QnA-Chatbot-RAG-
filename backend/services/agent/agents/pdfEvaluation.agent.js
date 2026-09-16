import fs from "fs"
import { PDFParse } from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { deductCredits } from "../utils/deductCredits.js"
import redis from "../../../shared/redis/redis.js"
import PdfContext from "../models/pdfContext.model.js"
import { deleteVectorStore, pdfCollectionName, vectorStore } from "../config/vectorDb.js"

const contextKey = (state) => `pdf-context:${state.userId}:${state.conversationId}`

const loadDocuments = async (state) => {
  if (state.pdfIndexed) {
    const context = await PdfContext.findOne({
      userId: state.userId,
      conversationId: state.conversationId,
      expiresAt: { $gt: new Date() }
    }).lean()
    if (!context) throw new Error("Indexed PDF context was not found.")
    return context.chunks
  }

  if (state.file) {
    const parser = new PDFParse({ data: fs.readFileSync(state.file.path) })
    try {
      const result = await parser.getText()
      const text = result.text?.trim()
      if (!text) throw new Error("The uploaded PDF does not contain extractable text.")
      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
      const chunks = await splitter.createDocuments([text])
      const collectionName = pdfCollectionName(state.userId, state.conversationId)
      await deleteVectorStore(collectionName)
      await vectorStore(chunks, collectionName)
      await PdfContext.findOneAndUpdate(
        { userId: state.userId, conversationId: state.conversationId },
        {
          userId: state.userId,
          conversationId: state.conversationId,
          sourceName: state.file.originalname,
          collectionName,
          chunks,
          expiresAt: new Date(Date.now() + 3600 * 1000)
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      await redis.set(contextKey(state), "1", "EX", 3600).catch((error) => {
        console.error("PDF evaluation context marker unavailable", error)
      })
      return chunks
    } finally {
      await parser.destroy().catch(() => {})
    }
  }

  const context = await PdfContext.findOne({
    userId: state.userId,
    conversationId: state.conversationId,
    expiresAt: { $gt: new Date() }
  }).lean()
  if (!context) throw new Error("No PDF is attached to this conversation. Upload a PDF first.")
  return context.chunks
}

export const pdfEvaluation = async (state) => {
  try {
    await checkAgentLimit(state.userId, "pdf")
    const documents = await loadDocuments(state)
    const context = documents.map((document, index) => `Chunk ${index + 1}:\n${document.pageContent}`).join("\n\n")
    const model = await getModel("pdf-evaluation")
    const response = await model.invoke([
      new SystemMessage(`You are Hershey's PDF Evaluation Agent.

Use only the uploaded PDF as your source. Perform the user's requested operation, not just a fact lookup. Support arbitrary grounded tasks including evaluation, scoring, reviewing, summarizing, extracting, comparing, rewriting, recommendations, calculations, and transformations.

For scores or evaluations:
- State that the result is an estimate when the PDF does not contain an official score.
- Define the criteria and weighting used.
- Show the result clearly.
- Give specific evidence from the PDF.
- List actionable improvements.

Never invent facts that are absent from the PDF. If required information is missing, identify what is missing. Return concise Markdown and no preamble.`),
      new HumanMessage(`Uploaded PDF context:\n${context}\n\nUser request:\n${state.prompt}`)
    ])
    await deductCredits(state.userId, "pdf")
    return { ...state, aiResponse: response.content }
  } catch (error) {
    console.error("pdf evaluation failed", error)
    return { ...state, aiResponse: error?.data?.message || `failed to evaluate pdf: ${error.message}` }
  } finally {
    if (state.file?.path && fs.existsSync(state.file.path)) fs.unlinkSync(state.file.path)
  }
}
