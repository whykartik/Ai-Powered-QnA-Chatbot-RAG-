import { ingestArtifact, listArtifacts, removeArtifact } from "./service.js"
import { answerQuery, streamAnswer } from "./generation.js"

const userId = (req) => req.headers["x-user-id"]

export const uploadArtifact = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "A PDF, PPTX, XLSX, or CSV file is required." })
    const artifact = await ingestArtifact({ file: req.file, userId: userId(req) })
    return res.status(201).json(artifact)
  } catch (error) { next(error) }
}

export const getArtifacts = async (req, res, next) => {
  try { return res.json(await listArtifacts(userId(req))) } catch (error) { next(error) }
}

export const deleteArtifact = async (req, res, next) => {
  try {
    const deleted = await removeArtifact({ userId: userId(req), artifactId: req.params.id })
    return deleted ? res.status(204).send() : res.status(404).json({ message: "Artifact not found" })
  } catch (error) { next(error) }
}

export const queryArtifacts = async (req, res, next) => {
  try {
    const { query, topK, filters } = req.body
    if (!query?.trim()) return res.status(400).json({ message: "query is required" })
    return res.json(await answerQuery({ userId: userId(req), query: query.trim(), topK, filters }))
  } catch (error) { next(error) }
}

export const streamQueryArtifacts = async (req, res, next) => {
  try {
    const { query, topK, filters } = req.body
    if (!query?.trim()) return res.status(400).json({ message: "query is required" })
    res.status(200)
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" })
    res.flushHeaders()
    const result = await streamAnswer({
      userId: userId(req), query: query.trim(), topK, filters,
      onToken: async (token) => res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
    })
    res.write(`event: sources\ndata: ${JSON.stringify({ sources: result.sources, diagnostics: result.diagnostics })}\n\n`)
    res.write("event: done\ndata: {}\n\n")
    return res.end()
  } catch (error) {
    if (!res.headersSent) return next(error)
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`)
    return res.end()
  }
}
