import fs from "node:fs/promises"
import { PDFParse } from "pdf-parse"
import { pdf as renderPdf } from "pdf-to-img"
import { createWorker } from "tesseract.js"
import { documentSchema } from "../schema.js"
import { ragConfig } from "../config.js"

const ocrPdf = async (filePath, sourceFile, baseMetadata) => {
  if (!ragConfig.ocrEnabled) return []
  const rendered = await renderPdf(filePath, { scale: 2 })
  const worker = await createWorker("eng")
  const documents = []
  let page = 0
  try {
    for await (const image of rendered) {
      page += 1
      const { data } = await worker.recognize(image)
      if (data.text?.trim()) {
        documents.push(documentSchema({
          text: data.text,
          sourceFile,
          location: { page },
          metadata: { ...baseMetadata, extraction: "ocr" }
        }))
      }
    }
  } finally {
    await worker.terminate()
    rendered.destroy?.()
  }
  return documents
}

export const parsePdf = async ({ filePath, sourceFile, metadata = {} }) => {
  const buffer = await fs.readFile(filePath)
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const text = result.text?.trim()
    if (text) {
      return [documentSchema({
        text,
        sourceFile,
        location: { page: 1 },
        metadata: { ...metadata, artifact_type: "pdf", extraction: "text" }
      })]
    }
    return ocrPdf(filePath, sourceFile, { ...metadata, artifact_type: "pdf" })
  } finally {
    await parser.destroy().catch(() => {})
  }
}
