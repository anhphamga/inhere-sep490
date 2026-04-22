import {
  listDamagePoliciesRequest,
  getDamagePolicyRequest,
  resolveDamagePolicyRequest,
  createDamagePolicyRequest,
  updateDamagePolicyRequest,
  deleteDamagePolicyRequest,
} from '../api/damage-policy.api'

export const listDamagePoliciesApi = async (params = {}) => {
  const response = await listDamagePoliciesRequest(params)
  return response.data
}

export const getDamagePolicyApi = async (id) => {
  const response = await getDamagePolicyRequest(id)
  return response.data
}

export const resolveDamagePolicyApi = async (params = {}) => {
  const response = await resolveDamagePolicyRequest(params)
  return response.data
}

export const createDamagePolicyApi = async (payload) => {
  const response = await createDamagePolicyRequest(payload)
  return response.data
}

export const updateDamagePolicyApi = async (id, payload) => {
  const response = await updateDamagePolicyRequest(id, payload)
  return response.data
}

export const deleteDamagePolicyApi = async (id) => {
  const response = await deleteDamagePolicyRequest(id)
  return response.data
}
