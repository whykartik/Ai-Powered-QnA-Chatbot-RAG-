import express from "express"
import { agent, cleanupPdfContext } from "../controllers/agent.controller.js"
import multer from "../config/multer.js"

const router=express.Router()

router.post("/chat",multer.single("file"),agent)
router.delete("/pdf-context/:conversationId",cleanupPdfContext)

export default router