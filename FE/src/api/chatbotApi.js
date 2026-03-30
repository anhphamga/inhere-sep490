import axiosClient from '../config/axios'

export const sendChatMessage = async ({ message, topK = 4 }) => {
  try {
    const response = await axiosClient.post('/chatbot/chat-with-tools', {
      message,
      topK,
    }, {
      timeout: 25000,
    })

    return response.data
  } catch (error) {
    const status = error?.response?.status

    // Keep old RAG flow working for guest users or expired sessions.
    if (status === 401 || status === 403) {
      const fallback = await axiosClient.post('/chatbot/chat', {
        message,
        topK,
      }, {
        timeout: 25000,
      })

      return fallback.data
    }

    throw error
  }
}
