import { getModel } from "../config/llmModels.js"
import redis from "../../../shared/redis/redis.js"
import PdfContext from "../models/pdfContext.model.js"

const pdfContextKey = (state) => `pdf-context:${state.userId}:${state.conversationId}`
const evaluationRequest = /score|rate|evaluat|review|analys|summari|extract|compare|improv|rewrit|recommend|optimi|assess|critic|tailor|match/i

export const router = async (state) => {
  const promptText = (state.prompt || "").toLowerCase()

  if (state.file) {
    if (state.file.mimetype === "application/pdf") {
    return {
      ...state,
      agent: "pdfRag",
      pdfOperation: evaluationRequest.test(state.prompt)
    }
    }

    if (state.file.mimetype.startsWith("image/")) {
    return {
      ...state,
      agent:"imageAnalyzer"
    }
    }
  }

  if (state.agent && state.agent !== "auto") {
    return {
      ...state,
      agent: state.agent
    }
  }

  if (/(generate|create|make|build).*(pdf|document|resume|cv)/i.test(state.prompt) || /\b(pdf|resume|cv|document)\b/i.test(state.prompt) && /\b(generate|create|make|build)\b/i.test(state.prompt)) {
    return {
      ...state,
      agent: "pdf"
    }
  }

  if (/(generate|create|make|build).*(ppt|powerpoint|presentation|slides)/i.test(state.prompt) || /\b(ppt|powerpoint|presentation|slides)\b/i.test(state.prompt) && /\b(generate|create|make|build)\b/i.test(state.prompt)) {
    return {
      ...state,
      agent: "ppt"
    }
  }

  if (/(generate|create|make|build).*(image|illustration|poster|banner|artwork|thumbnail)/i.test(state.prompt) || /\b(image|illustration|poster|banner|artwork|thumbnail)\b/i.test(state.prompt) && /\b(generate|create|make|build)\b/i.test(state.prompt)) {
    return {
      ...state,
      agent: "vision"
    }
  }

  try {
    let redisHasContext = false
    try {
      redisHasContext = Boolean(state.conversationId && await redis.exists(pdfContextKey(state)))
    } catch (error) {
      console.error("pdf Redis context lookup failed; checking MongoDB", error)
    }
    const mongoHasContext = state.conversationId && await PdfContext.exists({
      userId: state.userId,
      conversationId: state.conversationId,
      expiresAt: { $gt: new Date() }
    })
    if (redisHasContext || mongoHasContext) {
      return {
        ...state,
        agent: evaluationRequest.test(state.prompt) ? "pdfEvaluation" : "pdfRag",
        pdfOperation: evaluationRequest.test(state.prompt)
      }
    }
  } catch (error) {
    console.error("pdf context lookup failed", error)
  }

  // Fast-path keyword matching to eliminate extra LLM routing overhead
  if (/^(hi|hello|hey|greetings|howdy|thanks|thank you|who are you|what can you do)/i.test(promptText) || promptText.length < 20) {
    return { ...state, agent: "chat" }
  }
  if (/(code|function|bug|error|script|react|python|java|javascript|html|css|sql|api|build|debug)/i.test(promptText)) {
    return { ...state, agent: "coding" }
  }
  if (/(search|latest|news|weather|price|who is|where is|today|current|internet)/i.test(promptText)) {
    return { ...state, agent: "search" }
  }

  try {
    const llm = await getModel("router")
    const prompt = `You are an agent router.

Available agents:
- chat
- search
- coding
- pdf
- ppt
- vision 

Return ONLY one word: chat, search, coding, pdf, ppt, vision.

User Query: ${state.prompt}`

    const response = await llm.invoke(prompt)

    return {
      ...state,
      agent: (response.content || "chat").trim().toLowerCase()
    }
  } catch (err) {
    return { ...state, agent: "chat" }
  }




}