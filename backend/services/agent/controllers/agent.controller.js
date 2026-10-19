import axios from "axios"
import { graph } from "../graph/graph.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
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

export const generateConversationTitle = async (req, res) => {
    const { prompt } = req.body
    if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ message: "prompt is required" })
    }

    const fallbackTitle = prompt.trim().replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ").slice(0, 60)

    try {
        const model = await getModel("chat")
        const response = await model.invoke([
            new SystemMessage("Create a concise, meaningful title for a conversation based on the user's message. Return only the title, in 3 to 7 words, with no quotes or ending punctuation."),
            new HumanMessage(prompt.trim().slice(0, 4000))
        ])
        const content = typeof response.content === "string"
            ? response.content
            : response.content.map(part => typeof part === "string" ? part : part.text || "").join(" ")
        const title = content.replace(/[\r\n"']/g, " ").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "").slice(0, 60)

        return res.status(200).json({ title: title || fallbackTitle })
    } catch (error) {
        console.error("Conversation title generation failed:", error.message)
        return res.status(200).json({ title: fallbackTitle })
    }
}