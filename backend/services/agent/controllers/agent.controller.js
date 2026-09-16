import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage } from "../config/memory.js"
import redis from "../../../shared/redis/redis.js"
import PdfContext from "../models/pdfContext.model.js"
import { deleteVectorStore } from "../config/vectorDb.js"

export const cleanupPdfContext=async (req,res,next)=>{
    try {
        const userId=req.headers["x-user-id"]
        const conversationId=req.params.conversationId
        const context=await PdfContext.findOne({userId,conversationId}).lean()
        if(context?.collectionName){
            await deleteVectorStore(context.collectionName)
        }
        await PdfContext.deleteOne({userId,conversationId})
        await redis.del(`pdf-context:${userId}:${conversationId}`).catch(() => {})
        return res.status(204).send()
    } catch (error) {
        next(error)
    }
}


export const agent=async (req,res,next) => {
    try {
        const {prompt,conversationId,agent}=req.body
        const file=req.file
        console.log("file",file)
        const userId=req.headers["x-user-id"]
        const saveUserMessage = axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
            conversationId,role:"user",content:prompt
        })
        const graphResult = graph.invoke({
            prompt,conversationId,agent,userId,file
        })
        const [result] = await Promise.all([graphResult, saveUserMessage])
        console.log("result",result)
       await addMessage(conversationId,"user",prompt)
        await addMessage(conversationId,"assistant",result.aiResponse)
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
            conversationId,role:"assistant",content:result?.aiResponse,images:result?.images,artifacts:result?.artifacts
        })
        return res.status(200).json({
            answer:result?.aiResponse,
            images:result?.images,
            artifacts:result?.artifacts
        })
       
    } catch (error) {
         console.error("agent request failed", error.response?.data || error.message)
       next(error)
    }
}