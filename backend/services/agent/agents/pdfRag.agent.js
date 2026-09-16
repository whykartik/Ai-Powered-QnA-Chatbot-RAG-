import fs from "fs"
import {PDFParse} from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { deleteVectorStore, existingVectorStore, pdfCollectionName, vectorStore } from "../config/vectorDb.js"
import { getModel } from "../config/llmModels.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import redis from "../../../shared/redis/redis.js"
import PdfContext from "../models/pdfContext.model.js"

const pdfContextKey = (state) => `pdf-context:${state.userId}:${state.conversationId}`
const maxContextCharacters = 30000
export const pdfRag=async (state)=>{
  let pdf
   try {
    await checkAgentLimit(state.userId,"pdf")
      let docs
      let collectionName=pdfCollectionName(state.userId,state.conversationId)
      if (state.file) {
        const previousContext=await PdfContext.findOne({
          userId: state.userId,
          conversationId: state.conversationId
        }).lean()
        if (previousContext?.collectionName && previousContext.collectionName !== collectionName) {
          await deleteVectorStore(previousContext.collectionName)
        }
        const buffer=fs.readFileSync(state.file.path)
        pdf=new PDFParse({
          data:buffer
        })

        const result=await pdf.getText()
        const text=result.text?.trim()

        if (!text) {
          throw new Error("The uploaded PDF does not contain extractable text.")
        }

        const spilliter=new RecursiveCharacterTextSplitter({
          chunkSize:1000,
          chunkOverlap:200
        })
        docs=await spilliter.createDocuments([text])
        await PdfContext.findOneAndUpdate(
          { userId: state.userId, conversationId: state.conversationId },
          {
            userId: state.userId,
            conversationId: state.conversationId,
            sourceName: state.file.originalname,
            collectionName,
            chunks: docs,
            expiresAt: new Date(Date.now() + 3600 * 1000)
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        try {
          await redis.set(pdfContextKey(state), "1", "EX", 3600)
        } catch (cacheError) {
          console.error("pdf context cache unavailable; MongoDB remains the source of truth", cacheError)
        }
        await vectorStore(docs, collectionName)
        if (state.pdfOperation) {
          return {
            ...state,
            agent: "pdfEvaluation",
            pdfIndexed: true
          }
        }
      } else {
        let cacheHit=false
        try {
          cacheHit=Boolean(await redis.get(pdfContextKey(state)))
        } catch (cacheError) {
          console.error("pdf context cache read failed; using MongoDB", cacheError)
        }
        const storedContext=await PdfContext.findOne({
          userId: state.userId,
          conversationId: state.conversationId,
          expiresAt: { $gt: new Date() }
        }).lean()
        if (!storedContext) {
          throw new Error("No PDF is attached to this conversation. Upload a PDF first.")
        }
        docs=storedContext.chunks
        if (!cacheHit) {
          try {
            await redis.set(pdfContextKey(state), "1", "EX", 3600)
          } catch (cacheError) {
            console.error("pdf context marker refresh failed", cacheError)
          }
        }
      }

      let relevantDocs
      try {
        const store = state.file
          ? await existingVectorStore(collectionName)
          : await existingVectorStore(collectionName)
        const completeContext = docs.map((doc) => doc.pageContent).join("\n\n")
        relevantDocs = completeContext.length <= maxContextCharacters
          ? docs
          : await store.similaritySearch(state.prompt,5)
      } catch (retrievalError) {
        console.error("pdf vector retrieval failed; using local text retrieval", retrievalError)
        relevantDocs=docs
          .map((doc) => ({
            doc,
            score: state.prompt.toLowerCase().split(/\W+/).filter(Boolean)
              .reduce((total, term) => total + (doc.pageContent.toLowerCase().includes(term) ? 1 : 0), 0)
          }))
          .sort((left, right) => right.score - left.score)
          .slice(0,5)
          .map(({doc}) => doc)
      }
      
      const context=relevantDocs.map(d=>d.pageContent).join("\n\n")
      
      let llm=await getModel("pdf-rag")

       const messages=[
          new SystemMessage(`You are Hershey PDF Assistant.

Rules:

      - Use the uploaded PDF as the source of truth.

- Never make up information.

      - Understand the user's requested task and perform it when it can be grounded in the PDF. This may include answering questions, summarizing, extracting structured information, calculating or estimating scores, reviewing, rewriting, comparing, transforming, generating recommendations, or any other reasonable operation requested by the user.

      - For calculations, evaluations, or derived results, clearly label estimates and explain the criteria or reasoning used.

      - If the requested task requires information that is not present in the PDF, say what is missing instead of inventing it.

"I couldn't find this information in the uploaded PDF."

- Use Markdown formatting.
`),

new HumanMessage(`
    Context:${context}
     Question:${state.prompt}
    `)
       ]


      let response
      try {
        response=await llm.invoke(messages)
      } catch (modelError) {
        console.error("pdf Gemini generation failed; trying Groq", modelError)
        llm=await getModel("chat")
        response=await llm.invoke(messages)
      }
      await deductCredits(state.userId,"pdf")
      console.log(response)
      return {
        ...state,
        aiResponse:response.content
      }



   } catch (error) {
          console.error("pdf analysis failed", error)
          return {
            ...state,
            aiResponse:error?.data?.message || `failed to analyze pdf: ${error.message}`
        }
   }finally{
         if (pdf) await pdf.destroy().catch(() => {})
         if (state.file?.path && fs.existsSync(state.file.path)) {
           fs.unlinkSync(state.file.path)
         }
   }


}