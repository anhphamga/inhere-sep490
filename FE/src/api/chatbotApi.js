import axiosClient from '../config/axios'

const CHATBOT_SESSION_ID_KEY = 'inhere_chatbot_session_id_v1'

const createChatbotSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getChatbotSessionId = () => {
  try {
    const existing = localStorage.getItem(CHATBOT_SESSION_ID_KEY)
    if (existing) {
      return existing
    }

    const generated = createChatbotSessionId()
    localStorage.setItem(CHATBOT_SESSION_ID_KEY, generated)
    return generated
  } catch {
    return createChatbotSessionId()
  }
}

export const sendChatMessage = async ({ message, topK = 4 }) => {
  const sessionId = getChatbotSessionId()

  try {
    const response = await axiosClient.post('/chatbot/chat-with-tools', {
      message,
      topK,
      sessionId,
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
        sessionId,
      }, {
        timeout: 25000,
      })

      return fallback.data
    }

    throw error
  }
}
