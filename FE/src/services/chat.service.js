import {
  getAiUnansweredRequest,
  sendChatMessageRequest,
} from '../api/chat.api'

export const sendChatMessageApi = async (payload) => {
  const response = await sendChatMessageRequest(payload)
  return response.data
}

export const getAiUnansweredApi = async (params = {}) => {
  const response = await getAiUnansweredRequest(params)
  return response.data
}
