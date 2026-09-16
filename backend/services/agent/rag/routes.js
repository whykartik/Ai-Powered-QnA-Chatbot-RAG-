import express from "express"
import upload from "./upload.js"
import { deleteArtifact, getArtifacts, queryArtifacts, uploadArtifact } from "./controller.js"

const router = express.Router()
router.post("/artifacts/upload", upload.single("file"), uploadArtifact)
router.get("/artifacts", getArtifacts)
router.delete("/artifacts/:id", deleteArtifact)
router.post("/query", queryArtifacts)
export default router
