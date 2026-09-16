import { cert, initializeApp } from "firebase-admin";
import fs from "fs";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "/etc/secrets/serviceAccountKey.json";
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

export const app = initializeApp({
  credential: cert(serviceAccount)
});