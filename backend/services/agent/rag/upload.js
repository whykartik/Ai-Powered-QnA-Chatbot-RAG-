import path from "node:path"
import fs from "node:fs"
import multer from "multer"
import { ragConfig } from "./config.js"

const uploadDir = path.resolve("./temp/rag")
fs.mkdirSync(uploadDir, { recursive: true })
const allowed = new Set([".pdf", ".pptx", ".xlsx", ".csv"])

export default multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: ragConfig.maxFileSize },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, allowed.has(extension))
  }
})
