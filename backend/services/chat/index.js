import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/chat.routes.js"

const port = Number(process.env.PORT) || 5002

const app=express()
app.use(express.json())
app.use("/",router)
app.use("/api/chat",router)
app.get("/",(req,res)=>{
    res.json({message:"hello from chat"})
})

const start = async () => {
    try {
        // Do not accept proxy traffic until the dependency used by every chat
        // endpoint is available. This prevents a deployment from looking ready
        // while requests fail immediately afterwards.
        await connectDb()
        app.listen(port, "0.0.0.0", () => {
            console.log(`chat started at ${port}`)
        })
    } catch (error) {
        console.error("chat failed to start", error)
        process.exit(1)
    }
}

start()
