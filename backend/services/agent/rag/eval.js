import "dotenv/config"
import { searchDocuments } from "./faissStore.js"

const userId = process.env.RAG_EVAL_USER_ID
const queries = JSON.parse(process.env.RAG_EVAL_QUERIES || '["What is the main topic?", "List the important names and numbers.", "What conclusion is presented?"]')

if (!userId) throw new Error("Set RAG_EVAL_USER_ID before running the evaluation.")

for (const query of queries) {
  const result = await searchDocuments({ userId, query })
  console.log(JSON.stringify({ query, diagnostics: result.diagnostics, sources: result.sources.map((source) => source.metadata.source_file) }))
}