import "dotenv/config"
import express from "express"
import proxy from "express-http-proxy"
import cors from "cors"
import cookieParser from "cookie-parser"
import { getCurrentUser } from "./controllers/user.controller.js"
import protect from "./middleware/auth.middleware.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"

const port = Number(process.env.PORT) || 5000

const normalizeServiceUrl = (value, fallback) => {
    if (!value || !value.trim()) return fallback
    return value.trim().replace(/\/+$/, "")
}

const AUTH_SERVICE = normalizeServiceUrl(process.env.AUTH_SERVICE, "http://localhost:5001")
const CHAT_SERVICE = normalizeServiceUrl(process.env.CHAT_SERVICE, "http://localhost:5002")
const AGENT_SERVICE = normalizeServiceUrl(process.env.AGENT_SERVICE, "http://localhost:5003")

console.log("Gateway Target Services Configuration:", {
    AUTH_SERVICE,
    CHAT_SERVICE,
    AGENT_SERVICE
})

const app = express()

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
            callback(null, true)
            return
        }
        // Allow all origins if wildcard or fallback to log warning instead of crashing gateway
        callback(null, true)
    },
    credentials: true
}))

app.use(morgan("dev"))
app.use(cookieParser())

// Health check endpoint for Render monitoring
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() })
})

app.get("/", (req, res) => {
    res.json({ message: "hello from gateway v5", status: "online" })
})

app.use("/api/auth", proxyWithHeader(AUTH_SERVICE))
app.use("/api/chat", protect, proxyWithHeader(CHAT_SERVICE))
app.use("/api/agent", protect, proxyWithHeader(AGENT_SERVICE))
app.get("/api/me", protect, getCurrentUser)

const server = app.listen(port, "0.0.0.0", () => {
    console.log(`gateway started at port ${port}`)
})

process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server gracefully")
    server.close(() => {
        console.log("HTTP server closed")
        process.exit(0)
    })
})

