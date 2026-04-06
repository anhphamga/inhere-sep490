import {
  checkoutRequest,
  getGuestSaleOrderByIdRequest,
  getMySaleOrderByIdRequest,
  getMySaleOrdersRequest,
  guestCheckoutRequest,
} from '../api/order.api'

export const checkoutApi = async (payload) => {
  const response = await checkoutRequest(payload)
  return response.data
}

export const guestCheckoutApi = async (payload) => {
  const response = await guestCheckoutRequest(payload)
  return response.data
}

export const getMySaleOrdersApi = async (params = {}) => {
  const response = await getMySaleOrdersRequest(params)
  return response.data
}

export const getMySaleOrderByIdApi = async (id) => {
  const response = await getMySaleOrderByIdRequest(id)
  return response.data
}

export const getGuestSaleOrderByIdApi = async (id, token) => {
  const response = await getGuestSaleOrderByIdRequest(id, token)
  return response.data
}
