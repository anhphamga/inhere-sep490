import axiosClient from '../config/axios'

export const createBookingRequest = (payload) => axiosClient.post('/bookings', payload)
export const getBookingStatusRequest = (bookingId) => axiosClient.get(`/bookings/${bookingId}/status`)
export const createPaymentRequest = (payload) => axiosClient.post('/payments', payload)
