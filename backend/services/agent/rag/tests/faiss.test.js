import test from "node:test"
import assert from "node:assert/strict"
import faiss from "faiss-node"

test("FAISS float index reranks normalized vectors", () => {
  const index = new faiss.IndexFlatIP(2)
  index.add([1, 0, 0, 1])
  const result = index.search([1, 0], 2)
  assert.deepEqual(result.labels, [0, 1])
  assert.equal(result.distances[0], 1)
})
