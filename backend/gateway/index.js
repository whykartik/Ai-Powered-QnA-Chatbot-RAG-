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
app.set("trust proxy", 1)

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        // Reflect origin so credentials (cookies) work smoothly across domains
        callback(null, true)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "x-user-id"],
    exposedHeaders: ["Set-Cookie"]
}

app.use(cors(corsOptions))

// Intercept all OPTIONS preflight requests immediately so they are never proxied to downstream microservices
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
    res.header("Access-Control-Allow-Credentials", "true")
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-Requested-With, x-user-id")
    if (req.method === "OPTIONS") {
        return res.sendStatus(204)
    }
    next()
})

app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
    next()
})


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

