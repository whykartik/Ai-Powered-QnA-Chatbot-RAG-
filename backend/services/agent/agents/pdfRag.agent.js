import fs from "fs"
import {PDFParse} from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { vectorStore } from "../config/vectorDb.js"
import { getModel } from "../config/llmModels.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import redis from "../../../shared/redis/redis.js"

const pdfContextKey = (state) => `pdf-context:${state.userId}:${state.conversationId}`
export const pdfRag=async (state)=>{
  let pdf
   try {
    await checkAgentLimit(state.userId,"pdf")
      let docs
      if (state.file) {
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
        await redis.set(pdfContextKey(state), JSON.stringify(docs), "EX", 3600)
      } else {
        const savedContext=await redis.get(pdfContextKey(state))
        if (!savedContext) {
          throw new Error("No PDF is attached to this conversation. Upload a PDF first.")
        }
        docs=JSON.parse(savedContext)
      }

      let relevantDocs
      try {
        if (!state.file) throw new Error("Use saved PDF context")
        const collectionName=`pdf-${Date.now()}`
        const store=await vectorStore(docs,collectionName)
        relevantDocs=await store.similaritySearch(state.prompt,5)
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

- Answer ONLY from the uploaded PDF.

- Never make up information.

- If the answer is not present in the PDF, reply:

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