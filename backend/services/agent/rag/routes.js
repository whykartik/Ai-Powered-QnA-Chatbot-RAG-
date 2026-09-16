import express from "express"
import upload from "./upload.js"
import { deleteArtifact, getArtifacts, queryArtifacts, streamQueryArtifacts, uploadArtifact } from "./controller.js"

const router = express.Router()
router.post("/artifacts/upload", upload.single("file"), uploadArtifact)
router.get("/artifacts", getArtifacts)
router.delete("/artifacts/:id", deleteArtifact)
router.post("/query", queryArtifacts)
router.post("/query/stream", streamQueryArtifacts)
export default router
