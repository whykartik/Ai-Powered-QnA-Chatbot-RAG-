import axios from "axios"

export const getMessages=async (conversationId)=>{
    try {
       const {data}=await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`)
       return Array.isArray(data) ? data : []
    } catch (error) {
        return []
    }
}