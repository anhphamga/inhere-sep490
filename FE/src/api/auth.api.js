import axiosClient from '../config/axios'

export const signupRequest = (payload) => axiosClient.post('/auth/signup', payload)
export const loginRequest = (payload) => axiosClient.post('/auth/login', payload)
export const googleLoginRequest = (payload) => axiosClient.post('/auth/google-login', payload)
export const forgotPasswordRequest = (payload) => axiosClient.post('/auth/forgot-password', payload)
export const resetPasswordRequest = (payload) => axiosClient.post('/auth/reset-password', payload)
export const logoutRequest = () => axiosClient.post('/auth/logout')
export const getMeRequest = () => axiosClient.get('/auth/me')
export const getProfileRequest = () => axiosClient.get('/users/me')
export const updateProfileRequest = (payload) => axiosClient.put('/users/me', payload)
export const changePasswordRequest = (payload) => axiosClient.put('/users/me/change-password', payload)

export const uploadAvatarRequest = (file) => {
    const formData = new FormData()
    formData.append('avatar', file)

    return axiosClient.put('/users/me/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
