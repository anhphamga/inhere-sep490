import axiosClient from '../config/axios'

export const toggleFavorite = async (productId) => {
  const response = await axiosClient.post('/favorites/toggle', { productId })
  return response.data
}

export const getMyFavorites = async (page = 1, limit = 20) => {
  const response = await axiosClient.get('/favorites/my', {
    params: { page, limit },
  })
  return response.data
}

export const checkFavorite = async (productId) => {
  const response = await axiosClient.get(`/favorites/check/${productId}`)
  return response.data
}
