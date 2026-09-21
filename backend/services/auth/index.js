import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/auth.route.js"

const port = Number(process.env.PORT) || 5001

const app = express()
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

