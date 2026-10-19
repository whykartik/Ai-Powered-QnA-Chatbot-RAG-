import api from '../../utils/axios'

export const generateConversationTitle = async (prompt) => {
  try {
    const { data } = await api.post('/api/agent/title', { prompt })
    return data?.title || null
  } catch (error) {
    console.error('Failed to generate conversation title', error)
    return null
  }
}