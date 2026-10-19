import redis from "../../../shared/redis/redis.js"
import { getMessages } from "../utils/getMessages.js"
export const getMemory=async (conversationId)=>{
    if (!conversationId) return []
    const key=`messages-${conversationId}`
    const cached=await redis.get(key)
    if(cached){
        try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed)) return parsed
        } catch (e) {}
    }
    
    const messages=await getMessages(conversationId)
    const safeMessages = Array.isArray(messages) ? messages : []
    await redis.set(key,JSON.stringify(safeMessages),"EX",24*60*60)
    
    return safeMessages
}


export const addMessage=async (conversationId,role,content)=>{
     const key=`messages-${conversationId}`
     const rawMessages=await redis.get(key)
     const messages=rawMessages?JSON.parse(rawMessages):[]
     messages.push({
        role,content
     })

     if(messages.length>20){
        messages.shift()
     }

     await redis.set(key,JSON.stringify(messages))
}

