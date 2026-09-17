import api from "../../utils/axios"

export const getConversations=async () => {
    try {
        const {data}=await api.get("/api/chat/get-conversations")
        return data
    } catch (error) {
        const status = error?.response?.status
        if (status === 400 || status === 401 || status === 403) {
            return []
        }
        console.log(error)
        return []
    }
}