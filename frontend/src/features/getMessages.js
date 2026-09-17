
import api from '../../utils/axios'

async function getMessages(id) {
try {
    const {data}=await api.get(`/api/chat/get-messages/${id}`)
    console.log(data)
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

export default getMessages
