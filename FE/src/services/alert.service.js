import axiosClient from '../config/axios'

export const getAlertsApi = async (params = {}) => {
  const response = await axiosClient.get('/alerts', { params })
  return response.data
}

export const updateAlertStatusApi = async (alertId, status) => {
  const response = await axiosClient.patch(`/alerts/${alertId}/status`, { status })
  return response.data
}

export const markAlertAsReadApi = async (alertId) => {
  const response = await axiosClient.patch(`/alerts/${alertId}/read`)
  return response.data
}

export const markAllAlertsAsReadApi = async () => {
  const response = await axiosClient.patch('/alerts/read-all')
  return response.data
}

export const deleteAlertApi = async (alertId) => {
  const response = await axiosClient.delete(`/alerts/${alertId}`)
  return response.data
}
