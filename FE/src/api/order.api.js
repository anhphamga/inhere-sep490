import axiosClient from '../config/axios'

export const checkoutRequest = (payload) => axiosClient.post('/orders/checkout', payload)
export const guestCheckoutRequest = (payload) => axiosClient.post('/orders/guest-checkout', payload)
export const getMySaleOrdersRequest = (params) => axiosClient.get('/orders/my', { params })
export const getMySaleOrderByIdRequest = (id) => axiosClient.get(`/orders/my/${id}`)
export const getGuestSaleOrderByIdRequest = (id, token) =>
  axiosClient.get(`/orders/guest/${id}`, {
    params: { token },
    skipAuthRedirect: true,
  })
