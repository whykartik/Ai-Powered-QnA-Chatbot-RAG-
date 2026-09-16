import { embeddings } from "../config/embeddings.js"

export const embedDocuments = async (texts, batchSize = 32) => {
  const vectors = []
  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize)
    let lastError
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        vectors.push(...await embeddings.embedDocuments(batch))
        lastError = null
        break
      } catch (error) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    if (lastError) throw lastError
  }
  return vectors
}

export const embedQuery = (text) => embeddings.embedQuery(text)
