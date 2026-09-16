import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { ragConfig } from "./config.js"

export const chunkDocuments = async (documents, options = {}) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize || ragConfig.chunkSize,
    chunkOverlap: options.chunkOverlap ?? ragConfig.chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""]
  })
  const chunks = []
  for (const document of documents) {
    if (!document.text?.trim()) continue
    const pieces = await splitter.createDocuments([document.text])
    pieces.forEach((piece, index) => {
      chunks.push({
        text: piece.pageContent,
        metadata: {
          ...document.metadata,
          chunk_index: index,
          source_file: document.source_file,
          page: document.page ?? document.metadata?.page,
          slide: document.slide ?? document.metadata?.slide,
          sheet: document.sheet ?? document.metadata?.sheet,
          row: document.row ?? document.metadata?.row
        }
      })
    })
  }
  return chunks
}
