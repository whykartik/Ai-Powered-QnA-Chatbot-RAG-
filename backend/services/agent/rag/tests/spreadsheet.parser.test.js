import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { parseSpreadsheet } from "../parsers/spreadsheet.parser.js"

test("CSV parser preserves header and row context", async () => {
  const filePath = path.join(os.tmpdir(), `rag-${Date.now()}.csv`)
  await fs.writeFile(filePath, "Name,Score\nAda,10\nGrace,9\n")
  const documents = await parseSpreadsheet({ filePath, sourceFile: "scores.csv" })
  assert.equal(documents.length, 2)
  assert.match(documents[0].text, /Name: Ada/)
  assert.equal(documents[0].row, 2)
  await fs.unlink(filePath)
})