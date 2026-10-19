import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/auth.route.js"

const port = Number(process.env.PORT) || 5001

const app = express()
app.set("trust proxy", 1)

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

app.use(express.json())


app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "auth" })
})

app.use("/", router)
app.use("/api/auth", router)

app.get("/", (req, res) => {
    res.json({ message: "hello from auth" })
})

const server = app.listen(port, "0.0.0.0", () => {
    console.log(`auth service started at ${port}`)
    connectDb().catch(err => console.error("Database connection failure:", err))
})

process.on("SIGTERM", () => {
    console.log("SIGTERM received for auth service, shutting down gracefully...")
    server.close(() => process.exit(0))
})

