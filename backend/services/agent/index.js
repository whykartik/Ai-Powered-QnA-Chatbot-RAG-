import "dotenv/config"
import express from "express"
import connectDb from "./config/db.js"
import router from "./routes/agent.route.js"
import ragRouter from "./rag/routes.js"

const port = Number(process.env.PORT) || 5003

const app=express()

app.use(express.json())
app.use("/",router)
app.use("/api/agent",router)
app.use("/",ragRouter)
app.use("/api/agent/rag",ragRouter)

app.use((err,req,res,next)=>{
  console.log(err)

  if(err.status){
    return res.status(err.status).json(err.data)
  }

  return res.status(500).json({message:`agent error ${err.message}`})
})


app.get("/",(req,res)=>{
    res.json({message:"hello from agent"})
})

app.listen(port, "0.0.0.0", () => {
    console.log(`agent started at ${port}`)
    connectDb()
})
