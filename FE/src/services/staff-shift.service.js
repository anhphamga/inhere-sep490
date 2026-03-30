import axiosClient from '../config/axios'

export const getMyShiftOptionsApi = async (params = {}) => {
  const response = await axiosClient.get('/users/me/shifts', { params })
  return response.data
}

export const registerMyShiftApi = async (shiftId) => {
  const response = await axiosClient.post(`/users/me/shifts/${shiftId}/register`)
  return response.data
}

export const unregisterMyShiftApi = async (shiftId) => {
  const response = await axiosClient.delete(`/users/me/shifts/${shiftId}/register`)
  return response.data
}
