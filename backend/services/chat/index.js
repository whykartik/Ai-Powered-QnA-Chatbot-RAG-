import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/chat.routes.js"

const port = Number(process.env.PORT) || 5002

const app = express()

app.use(express.json())

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "chat" })
})

app.use("/", router)
app.use("/api/chat", router)

app.get("/", (req, res) => {
    res.json({ message: "hello from chat" })
})

let server

const start = async () => {
    try {
        await connectDb()
        server = app.listen(port, "0.0.0.0", () => {
            console.log(`chat service started at ${port}`)
        })
    } catch (error) {
        console.error("chat service failed to start:", error)
        process.exit(1)
    }
}

process.on("SIGTERM", () => {
    console.log("SIGTERM received for chat service, shutting down gracefully...")
    if (server) {
        server.close(() => process.exit(0))
    } else {
        process.exit(0)
    }
})

start()

