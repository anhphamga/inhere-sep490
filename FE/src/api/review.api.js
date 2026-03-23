import axiosClient from '../config/axios'

export const createReviewRequest = (payload) => axiosClient.post('/reviews', payload)
export const updateReviewRequest = (id, payload) => axiosClient.put(`/reviews/${id}`, payload)
export const getProductReviewsRequest = (productId, params) => axiosClient.get(`/reviews/product/${productId}`, { params })
export const getMyReviewsRequest = (params) => axiosClient.get('/reviews/my', { params })
export const canReviewRequest = (params) => axiosClient.get('/reviews/can-review', { params })
export const getAdminReviewsRequest = (params) => axiosClient.get('/reviews/admin', { params })
export const getAdminReviewDetailRequest = (id) => axiosClient.get(`/reviews/admin/${id}`)
export const patchAdminReviewStatusRequest = (id, payload) => axiosClient.patch(`/reviews/admin/${id}/status`, payload)
export const patchAdminHideReviewRequest = (id, payload) => axiosClient.patch(`/reviews/admin/${id}/hide`, payload)
export const patchAdminReplyReviewRequest = (id, payload) => axiosClient.patch(`/reviews/admin/${id}/reply`, payload)
export const deleteAdminReplyReviewRequest = (id) => axiosClient.delete(`/reviews/admin/${id}/reply`)
export const getAdminReviewStatsSummaryRequest = () => axiosClient.get('/reviews/admin/stats/summary')
