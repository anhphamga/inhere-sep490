import {
  canReviewRequest,
  createReviewRequest,
  getAdminReviewDetailRequest,
  getAdminReviewsRequest,
  getAdminReviewStatsSummaryRequest,
  getMyReviewsRequest,
  getProductReviewsRequest,
  patchAdminHideReviewRequest,
  patchAdminReplyReviewRequest,
  updateReviewRequest,
} from '../api/review.api'

export const createReviewApi = async (payload) => {
  const response = await createReviewRequest(payload)
  return response.data
}

export const updateReviewApi = async (id, payload) => {
  const response = await updateReviewRequest(id, payload)
  return response.data
}

export const getProductReviewsApi = async (productId, params = {}) => {
  const response = await getProductReviewsRequest(productId, params)
  return response.data
}

export const getMyReviewsApi = async (params = {}) => {
  const response = await getMyReviewsRequest(params)
  return response.data
}

export const canReviewApi = async (params = {}) => {
  const response = await canReviewRequest(params)
  return response.data
}

export const getAdminReviewsApi = async (params = {}) => {
  const response = await getAdminReviewsRequest(params)
  return response.data
}

export const getAdminReviewDetailApi = async (id) => {
  const response = await getAdminReviewDetailRequest(id)
  return response.data
}

export const patchAdminHideReviewApi = async (id, payload) => {
  const response = await patchAdminHideReviewRequest(id, payload)
  return response.data
}

export const patchAdminReplyReviewApi = async (id, payload) => {
  const response = await patchAdminReplyReviewRequest(id, payload)
  return response.data
}

export const getAdminReviewStatsSummaryApi = async () => {
  const response = await getAdminReviewStatsSummaryRequest()
  return response.data
}
