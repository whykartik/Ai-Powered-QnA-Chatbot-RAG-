import { getModel } from "../config/llmModels.js"
import redis from "../../../shared/redis/redis.js"

const pdfContextKey = (state) => `pdf-context:${state.userId}:${state.conversationId}`

export const router = async (state) => {
  if (state.file) {
    if (state.file.mimetype === "application/pdf") {
    return {
      ...state,
      agent:"pdfRag"
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

  try {
    if (state.conversationId && await redis.exists(pdfContextKey(state))) {
      return {
        ...state,
        agent: "pdfRag"
      }
    }
  } catch (error) {
    console.error("pdf context lookup failed", error)
  }

  


  const llm = await getModel("router")
  const prompt = `You are an agent router.

Available agents:

- chat
- search
- coding
- pdf
- ppt
- vision 

Rules:

chat:
General conversation,
explanations,
learning,
questions.

search:
Current events,
latest information,
news,
recent developments,
internet lookup.

coding:
Generate code,
debug code,
build projects,
architecture,
API design.

pdf:
Questions about generate PDFs
or document context.

ppt:
Questions about generate ppts
or ppt context.

vision:
  Generate image,
  create image

Return ONLY one word:

chat
search
coding
pdf
ppt
vision

User Query:
 ${state.prompt}
`

  const response = await llm.invoke(prompt)

  return {
    ...state,
    agent: response.content
      .trim()
      .toLowerCase()
  }



}