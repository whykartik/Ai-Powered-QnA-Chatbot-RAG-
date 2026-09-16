import test from "node:test"
import assert from "node:assert/strict"
import { chunkDocuments } from "../chunker.js"

test("chunker preserves source metadata", async () => {
  const chunks = await chunkDocuments([{
    text: "First row content. Second row content.",
    source_file: "table.csv",
    metadata: { artifact_type: "csv", sheet: "CSV", row: 2 }
  }], { chunkSize: 20, chunkOverlap: 5 })
  assert.ok(chunks.length > 0)
  assert.equal(chunks[0].metadata.source_file, "table.csv")
  assert.equal(chunks[0].metadata.sheet, "CSV")
})