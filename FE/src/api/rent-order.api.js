import axiosClient from '../config/axios'

// Tạo đơn thuê mới
export const createRentOrderRequest = (payload) => axiosClient.post('/rent-orders', payload)

// Lấy danh sách đơn thuê của customer
export const getMyRentOrdersRequest = (params) => axiosClient.get('/rent-orders/my', { params })

// Lấy chi tiết đơn thuê
export const getRentOrderByIdRequest = (id) => axiosClient.get(`/rent-orders/${id}`)

// Thanh toán đặt cọc
export const payDepositRequest = (id, payload) => axiosClient.post(`/rent-orders/${id}/deposit`, payload)

// Hủy đơn thuê
export const cancelRentOrderRequest = (id) => axiosClient.put(`/rent-orders/${id}/cancel`)

// Lấy tất cả đơn thuê (Staff/Owner)
export const getAllRentOrdersRequest = (params) => axiosClient.get('/rent-orders/all', { params })

// Hoàn tất giặt - chuyển từ Washing về Available
export const completeWashingRequest = (orderId, payload) => axiosClient.put(`/rent-orders/${orderId}/complete-washing`, payload)

// Xác nhận đơn thuê (Staff)
export const confirmRentOrderRequest = (id) => axiosClient.put(`/rent-orders/${id}/confirm`)

// Xác nhận khách lấy đồ (Staff)
export const confirmPickupRequest = (id) => axiosClient.put(`/rent-orders/${id}/pickup`)

// Xác nhận trả đồ (Staff)
export const confirmReturnRequest = (id, payload) => axiosClient.put(`/rent-orders/${id}/return`, payload)
