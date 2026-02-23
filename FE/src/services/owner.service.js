import axiosClient from '../api/axiosClient'

export const getOwnerDashboardSummaryApi = async () => {
    const response = await axiosClient.get('/owner/analytics/summary')
    return response.data
}

export const getOwnerRevenueAnalyticsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/analytics/revenue', { params })
    return response.data
}

export const getOwnerInventoryStatsApi = async () => {
    const response = await axiosClient.get('/owner/analytics/inventory')
    return response.data
}

export const getOwnerCustomerStatsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/analytics/customers', { params })
    return response.data
}

export const getOwnerTopProductsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/analytics/top-products', { params })
    return response.data
}

export const getOwnerRentalStatsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/analytics/rentals', { params })
    return response.data
}

export const getOwnerProductsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/products', { params })
    return response.data
}

export const getOwnerProductDetailApi = async (productId) => {
    const response = await axiosClient.get(`/owner/products/${productId}`)
    return response.data
}

export const createOwnerProductApi = async (payload) => {
    const imageFiles = Array.isArray(payload?.imageFiles) ? payload.imageFiles : []
    const instances = Array.isArray(payload?.instances) ? payload.instances : []

    if (imageFiles.length > 0 || instances.length > 0) {
        const formData = new FormData()

        const fields = [
            'name',
            'category',
            'size',
            'color',
            'quantity',
            'description',
            'baseRentPrice',
            'baseSalePrice',
            'depositAmount',
            'buyoutValue'
        ]

        fields.forEach((field) => {
            if (payload?.[field] !== undefined && payload?.[field] !== null) {
                formData.append(field, String(payload[field]))
            }
        })

        imageFiles.forEach((file) => {
            formData.append('images', file)
        })

        if (instances.length > 0) {
            formData.append('instances', JSON.stringify(instances))
        }

        const response = await axiosClient.post('/owner/products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    }

    const response = await axiosClient.post('/owner/products', payload)
    return response.data
}

export const updateOwnerProductApi = async (productId, payload) => {
    const imageFiles = Array.isArray(payload?.imageFiles) ? payload.imageFiles : []

    if (imageFiles.length > 0) {
        const formData = new FormData()

        const fields = [
            'name',
            'category',
            'size',
            'color',
            'quantity',
            'description',
            'baseRentPrice',
            'baseSalePrice',
            'depositAmount',
            'buyoutValue'
        ]

        fields.forEach((field) => {
            if (payload?.[field] !== undefined && payload?.[field] !== null) {
                formData.append(field, String(payload[field]))
            }
        })

        imageFiles.forEach((file) => {
            formData.append('images', file)
        })

        const response = await axiosClient.put(`/owner/products/${productId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    }

    const response = await axiosClient.put(`/owner/products/${productId}`, payload)
    return response.data
}

export const updateOwnerProductCollateralApi = async (productId, payload) => {
    const response = await axiosClient.patch(`/owner/products/${productId}/collateral`, payload)
    return response.data
}

export const deleteOwnerProductApi = async (productId) => {
    const response = await axiosClient.delete(`/owner/products/${productId}`)
    return response.data
}

export const getOwnerStaffApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/staff', { params })
    return response.data
}

export const getOwnerStaffDetailApi = async (staffId) => {
    const response = await axiosClient.get(`/owner/staff/${staffId}`)
    return response.data
}

export const createOwnerStaffApi = async (payload) => {
    const response = await axiosClient.post('/owner/staff', payload)
    return response.data
}

export const updateOwnerStaffStatusApi = async (staffId, status) => {
    const response = await axiosClient.patch(`/owner/staff/${staffId}/status`, { status })
    return response.data
}

export const lockOwnerStaffApi = async (staffId) => {
    const response = await axiosClient.patch(`/owner/staff/${staffId}/lock`)
    return response.data
}

export const getOwnerCustomersApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/customers', { params })
    return response.data
}

export const getOwnerCustomerDetailApi = async (customerId) => {
    const response = await axiosClient.get(`/owner/customers/${customerId}`)
    return response.data
}

export const updateOwnerCustomerStatusApi = async (customerId, status) => {
    const response = await axiosClient.patch(`/owner/customers/${customerId}/status`, { status })
    return response.data
}

export const getOwnerShiftsApi = async (params) => {
    const response = await axiosClient.get('/owner/shifts', { params })
    return response.data
}

export const createOwnerShiftApi = async (payload) => {
    const response = await axiosClient.post('/owner/shifts', payload)
    return response.data
}

export const updateOwnerShiftApi = async (shiftId, payload) => {
    const response = await axiosClient.put(`/owner/shifts/${shiftId}`, payload)
    return response.data
}

export const importOwnerProductsApi = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axiosClient.post('/owner/products/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })

    return response.data
}

export const exportOwnerProductsApi = async (params = {}) => {
    const response = await axiosClient.get('/owner/products/export', {
        params,
        responseType: 'blob'
    })

    return response
}