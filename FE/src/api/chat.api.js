import axiosClient from '../config/axios'

export const sendChatMessageRequest = (payload) => axiosClient.post('/ai/chat', payload)

export const getAiUnansweredRequest = (params = {}) => axiosClient.get('/ai/unanswered', { params })
