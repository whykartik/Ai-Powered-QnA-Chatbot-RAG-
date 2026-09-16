import path from "node:path"
import { parsePdf } from "./pdf.parser.js"
import { parsePptx } from "./pptx.parser.js"
import { parseSpreadsheet } from "./spreadsheet.parser.js"

const parsers = {
  ".pdf": parsePdf,
  ".pptx": parsePptx,
  ".xlsx": parseSpreadsheet,
  ".csv": parseSpreadsheet
}

export const parseArtifact = async (input) => {
  const extension = path.extname(input.sourceFile || input.filePath).toLowerCase()
  const parser = parsers[extension]
  if (!parser) throw new Error(`Unsupported artifact type: ${extension || "unknown"}`)
  return parser(input)
}
