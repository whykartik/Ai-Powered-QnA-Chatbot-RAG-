
import api from "../../utils/axios"

const getCurrentUser=async () => {
    try {
        const {data}=await api.get("/api/me")
        return data
    } catch (error) {
        const status = error?.response?.status
        if (status === 400 || status === 401 || status === 403) {
            return null
        }
        console.log(error)
        return null
    }
}

export default getCurrentUser