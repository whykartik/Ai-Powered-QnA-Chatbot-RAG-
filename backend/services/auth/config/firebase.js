import { cert, initializeApp } from "firebase-admin"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const defaultKeyPath = fileURLToPath(new URL("../serviceAccountKey.json", import.meta.url))
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultKeyPath

if (!fs.existsSync(keyPath)) {
  throw new Error(`Firebase service account key not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH to the correct file.`)
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"))

export const app = initializeApp({
  credential: cert(serviceAccount)
})