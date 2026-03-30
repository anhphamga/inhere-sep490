import axiosClient from '../config/axios'

export const getAlertsApi = async (params = {}) => {
  const response = await axiosClient.get('/alerts', { params })
  return response.data
}

export const updateAlertStatusApi = async (alertId, status) => {
  const response = await axiosClient.patch(`/alerts/${alertId}/status`, { status })
  return response.data
}
