import axiosClient from '../../../config/axios'
import {
  getOwnerDashboardApi,
  getOwnerInventoryAlertsApi,
  getOwnerProductDetailApi,
  getOwnerProductsApi,
  getOwnerTopProductsSummaryApi,
  getProductInstancesApi
} from '../../../services/owner.service'

export const getInventoryDashboardBundleApi = async (params = {}) => {
  return Promise.allSettled([
    getOwnerProductsApi(),
    getOwnerTopProductsSummaryApi(),
    getOwnerInventoryAlertsApi(),
    getOwnerDashboardApi(params)
  ])
}

export const getInventoryProductDetailApi = async (productId) => {
  return getOwnerProductDetailApi(productId)
}

export const getInventoryProductInstancesApi = async (productId, params = {}) => {
  return getProductInstancesApi(productId, params)
}

export const updateInventoryInstanceApi = async (instanceId, payload) => {
  const response = await axiosClient.put(`/products/instances/${instanceId}`, payload)
  return response.data
}

export const deleteInventoryInstanceApi = async (instanceId) => {
  const response = await axiosClient.delete(`/products/instances/${instanceId}`)
  return response.data
}
