import axiosClient from '../config/axios'

export const createBookingRequest = (payload) => axiosClient.post('/bookings', payload)
export const getStaffBookingsRequest = (params = {}) => axiosClient.get('/bookings', { params })
export const respondBookingRequest = (bookingId, payload) => axiosClient.patch(`/bookings/${bookingId}/respond`, payload)
export const getRentCategoriesRequest = () => axiosClient.get('/categories?lang=vi&purpose=rent')
export const createPaymentRequest = (payload) => axiosClient.post('/payments', payload)
