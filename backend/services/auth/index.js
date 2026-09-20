import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/auth.route.js"

const port = Number(process.env.PORT) || 5001

const app=express()
app.use(express.json())
app.use("/",router)
app.use("/api/auth",router)
app.get("/",(req,res)=>{
    res.json({message:"hello from auth"})
})

app.listen(port, "0.0.0.0", () => {
    console.log(`auth started at ${port}`)
    connectDb()
})
