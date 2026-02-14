import axiosClient from '../api/axiosClient'

export const signupApi = async (payload) => {
  const response = await axiosClient.post('/auth/signup', payload)
  return response.data
}

export const loginApi = async (payload) => {
  const response = await axiosClient.post('/auth/login', payload)
  return response.data
}

export const logoutApi = async () => {
  const response = await axiosClient.post('/auth/logout')
  return response.data
}

export const getMeApi = async () => {
  const response = await axiosClient.get('/auth/me')
  return response.data
}

export const getProfileApi = async () => {
  const response = await axiosClient.get('/users/me')
  return response.data
}

export const updateProfileApi = async (payload) => {
  const response = await axiosClient.put('/users/me', payload)
  return response.data
}

export const changePasswordApi = async (payload) => {
  const response = await axiosClient.put('/users/me/change-password', payload)
  return response.data
}

export const uploadAvatarApi = async (file) => {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await axiosClient.put('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return response.data
}
