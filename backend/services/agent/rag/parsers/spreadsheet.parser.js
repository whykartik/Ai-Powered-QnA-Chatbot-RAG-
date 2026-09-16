import fs from "node:fs/promises"
import path from "node:path"
import { parse as parseCsv } from "csv-parse/sync"
import XLSX from "xlsx"
import { documentSchema } from "../schema.js"

const rowText = (headers, row) => headers.map((header, index) => `${header}: ${row[index] ?? ""}`).join(" | ")

export const parseSpreadsheet = async ({ filePath, sourceFile, metadata = {} }) => {
  const extension = path.extname(sourceFile).toLowerCase()
  const workbook = extension === ".csv"
    ? XLSX.utils.book_new()
    : XLSX.read(await fs.readFile(filePath), { type: "buffer", cellDates: true })
  if (extension === ".csv") {
    const rows = parseCsv(await fs.readFile(filePath, "utf8"), { skip_empty_lines: true })
    const [headers = [], ...data] = rows
    return data.map((row, index) => documentSchema({
      text: rowText(headers, row),
      sourceFile,
      location: { sheet: "CSV", row: index + 2 },
      metadata: { ...metadata, artifact_type: "csv", headers }
    }))
  }
  return workbook.SheetNames.flatMap((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" })
    const [headers = [], ...data] = rows
    return data.map((row, index) => documentSchema({
      text: rowText(headers, row),
      sourceFile,
      location: { sheet: sheetName, row: index + 2 },
      metadata: { ...metadata, artifact_type: "xlsx", headers }
    }))
  })
}
