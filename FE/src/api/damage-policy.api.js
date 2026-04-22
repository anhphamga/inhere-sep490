import axiosClient from '../config/axios'

export const listDamagePoliciesRequest = (params = {}) => {
  return axiosClient.get('/damage-policies', { params })
}

export const getDamagePolicyRequest = (id) => {
  return axiosClient.get(`/damage-policies/${id}`)
}

export const resolveDamagePolicyRequest = (params = {}) => {
  return axiosClient.get('/damage-policies/resolve', { params })
}

export const createDamagePolicyRequest = (payload) => {
  return axiosClient.post('/damage-policies', payload)
}

export const updateDamagePolicyRequest = (id, payload) => {
  return axiosClient.put(`/damage-policies/${id}`, payload)
}

export const deleteDamagePolicyRequest = (id) => {
  return axiosClient.delete(`/damage-policies/${id}`)
}
