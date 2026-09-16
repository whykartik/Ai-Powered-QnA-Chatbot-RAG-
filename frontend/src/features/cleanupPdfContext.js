import api from "../../utils/axios"

export const cleanupPdfContext=async (conversationId)=>{
    try {
        await api.delete(`/api/agent/pdf-context/${conversationId}`)
    } catch (error) {
        console.log(error)
    }
}