import axiosClient from '../config/axios'

export const checkoutRequest = (payload) => axiosClient.post('/orders/checkout', payload)
export const guestCheckoutRequest = (payload) => axiosClient.post('/orders/guest-checkout', payload)
