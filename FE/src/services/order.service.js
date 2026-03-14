import { checkoutRequest, guestCheckoutRequest } from '../api/order.api'

export const checkoutApi = async (payload) => {
  const response = await checkoutRequest(payload)
  return response.data
}

export const guestCheckoutApi = async (payload) => {
  const response = await guestCheckoutRequest(payload)
  return response.data
}
