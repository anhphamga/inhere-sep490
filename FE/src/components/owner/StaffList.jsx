import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ban, BarChart2, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Eye, Search, Shield, UserPlus, X } from 'lucide-react'
import {
    createOwnerStaffApi,
    getOwnerStaffApi,
    getOwnerStaffDetailApi,
    getOwnerStaffPermissionsApi,
    updateOwnerStaffRoleApi,
    updateOwnerStaffPermissionsApi,
    updateOwnerStaffStatusApi
} from '../../services/owner.service'
import { useAuth } from '../../hooks/useAuth'
import { numberFormatter, toArray } from '../../utils/owner.utils'

const PAGE_SIZE = 10

export default function StaffList({ onViewCalendar, onViewAnalytics }) {
    const { user } = useAuth()
    const isPrimaryAdmin = Boolean(user?.isPrimaryAdmin)
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [updatingId, setUpdatingId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [selectedStaffDetail, setSelectedStaffDetail] = useState(null)
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [permissionLoading, setPermissionLoading] = useState(false)
    const [permissionSaving, setPermissionSaving] = useState(false)
    const [permissionError, setPermissionError] = useState('')
    const [permissionTarget, setPermissionTarget] = useState(null)
    const [permissionModes, setPermissionModes] = useState({})
    const [permissionCatalog, setPermissionCatalog] = useState([])
    const [permissionKeyword, setPermissionKeyword] = useState('')
    const [toast, setToast] = useState(null)
    const toastTimerRef = useRef(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        gender: '',
        role: 'staff',
        status: 'active'
    })

    const loadStaff = useCallback(async ({ status = '', role = 'all' } = {}) => {
        try {
            setLoading(true)
            setError('')
            const params = {}
            if (status) {
                params.status = status
            }
            if (role) {
                params.role = role
            }
            const response = await getOwnerStaffApi(params)
            setStaff(toArray(response?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách staff')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadStaff()
    }, [loadStaff])

    const filteredStaff = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        if (!keyword) {
            return staff
        }

        return staff.filter((item) => {
            const name = String(item?.name || '').toLowerCase()
            const email = String(item?.email || '').toLowerCase()
            const phone = String(item?.phone || '').toLowerCase()
            return name.includes(keyword) || email.includes(keyword) || phone.includes(keyword)
        })
    }, [staff, search])

    const totalItems = filteredStaff.length
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const startItemIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE
    const endItemIndex = Math.min(startItemIndex + PAGE_SIZE, totalItems)
    const paginatedStaff = filteredStaff.slice(startItemIndex, endItemIndex)

    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter, roleFilter])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    const activeCount = useMemo(() => filteredStaff.filter((item) => item?.status === 'active').length, [filteredStaff])
    const lockedCount = useMemo(() => filteredStaff.filter((item) => item?.status === 'locked').length, [filteredStaff])
    const pendingCount = useMemo(() => filteredStaff.filter((item) => item?.status === 'pending').length, [filteredStaff])

    const handleFilterChange = async (value) => {
        setStatusFilter(value)
        await loadStaff({ status: value, role: roleFilter })
    }

    const handleRoleFilterChange = async (value) => {
        setRoleFilter(value)
        await loadStaff({ status: statusFilter, role: value })
    }

    const handleToggleStatus = async (member) => {
        try {
            const currentStatus = String(member?.status || '').toLowerCase()
            const nextStatus = currentStatus === 'active' ? 'locked' : 'active'
            const actionLabel = currentStatus === 'pending'
                ? 'duyệt tài khoản'
                : (nextStatus === 'locked' ? 'khóa tài khoản' : 'mở khóa tài khoản')
            const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} cho ${member?.name || 'nhân sự này'}?`)
            if (!confirmed) {
                return
            }
            setUpdatingId(member.id)
            await updateOwnerStaffStatusApi(member.id, nextStatus)
            await loadStaff({ status: statusFilter, role: roleFilter })
            setToast({
                type: 'success',
                message: currentStatus === 'pending'
                    ? `Đã duyệt tài khoản ${member?.name || ''}`.trim()
                    : (nextStatus === 'locked'
                        ? `Đã khóa tài khoản ${member?.name || ''}`.trim()
                        : `Đã mở khóa tài khoản ${member?.name || ''}`.trim())
            })
        } catch (apiError) {
            const message = apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được trạng thái staff'
            setError(message)
            setToast({
                type: 'error',
                message
            })
        } finally {
            setUpdatingId('')
        }
    }

    const handleChangeRole = async (member) => {
        const currentRole = String(member?.role || '').toLowerCase()
        const nextRole = currentRole === 'owner' ? 'staff' : 'owner'

        try {
            const actionLabel = nextRole === 'owner' ? 'nâng lên Chủ shop' : 'hạ xuống Nhân viên'
            const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} cho ${member?.name || 'nhân sự này'}?`)
            if (!confirmed) {
                return
            }
            setUpdatingId(member.id)
            await updateOwnerStaffRoleApi(member.id, nextRole)
            await loadStaff({ status: statusFilter, role: roleFilter })
            setToast({
                type: 'success',
                message: nextRole === 'owner'
                    ? `Đã nâng ${member?.name || 'nhân sự'} lên Chủ shop`
                    : `Đã hạ ${member?.name || 'nhân sự'} xuống Nhân viên`
            })
        } catch (apiError) {
            const message = apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được vai trò nhân sự'
            setError(message)
            setToast({
                type: 'error',
                message
            })
        } finally {
            setUpdatingId('')
        }
    }

    const handleChangeFormField = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    const resetCreateForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            gender: '',
            role: 'staff',
            status: 'active'
        })
    }

    const handleOpenCreateModal = () => {
        resetCreateForm()
        setError('')
        setShowCreateForm(true)
    }

    const handleCloseCreateModal = () => {
        setShowCreateForm(false)
        resetCreateForm()
    }

    const handleCreateStaff = async (event) => {
        event.preventDefault()

        try {
            setSubmitting(true)
            setError('')

            await createOwnerStaffApi({
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                password: formData.password,
                gender: formData.gender || null,
                role: formData.role,
                status: formData.status
            })

            resetCreateForm()
            setShowCreateForm(false)
            await loadStaff({ status: statusFilter, role: roleFilter })
            setToast({
                type: 'success',
                message: 'Tạo tài khoản nhân sự thành công'
            })
        } catch (apiError) {
            const message = apiError?.response?.data?.message || apiError?.message || 'Không tạo được staff mới'
            setError(message)
            setToast({
                type: 'error',
                message
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleOpenStaffDetail = async (staffId) => {
        try {
            setDetailLoading(true)
            setError('')
            setShowDetailModal(true)

            const response = await getOwnerStaffDetailApi(staffId)
            setSelectedStaffDetail(response?.data || null)
        } catch (apiError) {
            setShowDetailModal(false)
            setSelectedStaffDetail(null)
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được chi tiết staff')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleCloseStaffDetail = () => {
        setShowDetailModal(false)
        setSelectedStaffDetail(null)
    }

    const handleApproveFromDetail = async () => {
        const targetId = selectedStaffDetail?.id
        if (!targetId || selectedStaffDetail?.status !== 'pending') {
            return
        }

        const confirmed = window.confirm(`Bạn có chắc muốn duyệt tài khoản cho ${selectedStaffDetail?.name || 'nhân sự này'}?`)
        if (!confirmed) {
            return
        }

        try {
            setUpdatingId(targetId)
            await updateOwnerStaffStatusApi(targetId, 'active')
            setSelectedStaffDetail((prev) => (prev ? { ...prev, status: 'active' } : prev))
            await loadStaff({ status: statusFilter, role: roleFilter })
            setToast({
                type: 'success',
                message: `Đã duyệt tài khoản ${selectedStaffDetail?.name || ''}`.trim()
            })
        } catch (apiError) {
            const message = apiError?.response?.data?.message || apiError?.message || 'Không duyệt được tài khoản'
            setError(message)
            setToast({
                type: 'error',
                message
            })
        } finally {
            setUpdatingId('')
        }
    }

    const handleOpenPermissionModal = async (member) => {
        try {
            setPermissionLoading(true)
            setPermissionSaving(false)
            setPermissionError('')
            setPermissionKeyword('')
            setPermissionTarget(member)
            setShowPermissionModal(true)

            const response = await getOwnerStaffPermissionsApi(member.id)
            const permissionData = response?.data || {}
            const allPermissions = Array.isArray(permissionData.allPermissions) ? permissionData.allPermissions : []
            const directPermissions = new Set(Array.isArray(permissionData.directPermissions) ? permissionData.directPermissions : [])
            const deniedPermissions = new Set(Array.isArray(permissionData.deniedPermissions) ? permissionData.deniedPermissions : [])

            const nextModes = {}
            allPermissions.forEach((permission) => {
                if (deniedPermissions.has(permission)) {
                    nextModes[permission] = 'deny'
                } else if (directPermissions.has(permission)) {
                    nextModes[permission] = 'allow'
                } else {
                    nextModes[permission] = 'default'
                }
            })

            setPermissionCatalog(allPermissions)
            setPermissionModes(nextModes)
        } catch (apiError) {
            setPermissionError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách quyền')
        } finally {
            setPermissionLoading(false)
        }
    }

    const handleClosePermissionModal = () => {
        if (permissionSaving) {
            return
        }
        setShowPermissionModal(false)
        setPermissionTarget(null)
        setPermissionCatalog([])
        setPermissionModes({})
        setPermissionKeyword('')
        setPermissionError('')
    }

    const handlePermissionModeChange = (permission, mode) => {
        setPermissionModes((prev) => ({
            ...prev,
            [permission]: mode
        }))
    }

    const handleSavePermissions = async () => {
        if (!permissionTarget?.id) {
            return
        }

        try {
            setPermissionSaving(true)
            setPermissionError('')

            const directPermissions = []
            const deniedPermissions = []

            Object.entries(permissionModes).forEach(([permission, mode]) => {
                if (mode === 'allow') {
                    directPermissions.push(permission)
                } else if (mode === 'deny') {
                    deniedPermissions.push(permission)
                }
            })

            await updateOwnerStaffPermissionsApi(permissionTarget.id, {
                directPermissions,
                deniedPermissions
            })

            await loadStaff({ status: statusFilter, role: roleFilter })
            handleClosePermissionModal()
        } catch (apiError) {
            setPermissionError(apiError?.response?.data?.message || apiError?.message || 'Không lưu được quyền')
        } finally {
            setPermissionSaving(false)
        }
    }

    const filteredPermissionCatalog = useMemo(() => {
        const keyword = permissionKeyword.trim().toLowerCase()
        if (!keyword) {
            return permissionCatalog
        }

        return permissionCatalog.filter((permission) => String(permission).toLowerCase().includes(keyword))
    }, [permissionCatalog, permissionKeyword])

    useEffect(() => {
        if (!toast) {
            return
        }

        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
        }

        toastTimerRef.current = setTimeout(() => {
            setToast(null)
            toastTimerRef.current = null
        }, 2500)

        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current)
                toastTimerRef.current = null
            }
        }
    }, [toast])

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải danh sách staff...</div>
    }

    return (
        <div className="space-y-6">
            {toast ? (
                <div className={`fixed top-5 right-5 z-[70] px-4 py-2 rounded-lg text-sm font-medium shadow-lg border ${
                    toast.type === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                    {toast.message}
                </div>
            ) : null}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm theo tên/email/sdt..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                        />
                    </div>

                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-[#1975d2] outline-none min-w-35"
                        value={statusFilter}
                        onChange={(event) => handleFilterChange(event.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Đang khóa</option>
                    </select>

                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-[#1975d2] outline-none min-w-35"
                        value={roleFilter}
                        onChange={(event) => handleRoleFilterChange(event.target.value)}
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="staff">Nhân viên</option>
                        <option value="owner">Chủ shop</option>
                    </select>

                    <button
                        onClick={onViewCalendar}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        <Calendar className="w-4 h-4" />
                        Xem lịch ca
                    </button>

                    <button
                        onClick={onViewAnalytics}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        <BarChart2 className="w-4 h-4" />
                        Phân tích staff
                    </button>
                </div>

                <button
                    onClick={handleOpenCreateModal}
                    className="md:ml-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#1975d2] text-white rounded-lg text-sm font-semibold hover:bg-[#145ea8] transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Thêm nhân sự
                </button>
            </div>

            {showCreateForm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={handleCloseCreateModal}>
                    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Tạo tài khoản nhân sự</h3>
                            <button
                                type="button"
                                onClick={handleCloseCreateModal}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm text-slate-600">
                                Tên nhân sự *
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(event) => handleChangeFormField('name', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                    placeholder="Nhập tên nhân sự"
                                />
                            </label>

                            <label className="text-sm text-slate-600">
                                Email *
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(event) => handleChangeFormField('email', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                    placeholder="staff@domain.com"
                                />
                            </label>

                            <label className="text-sm text-slate-600">
                                Số điện thoại
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(event) => handleChangeFormField('phone', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                    placeholder="Nhập số điện thoại"
                                />
                            </label>

                            <label className="text-sm text-slate-600">
                                Giới tính
                                <select
                                    value={formData.gender}
                                    onChange={(event) => handleChangeFormField('gender', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                >
                                    <option value="">Không chọn</option>
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                    <option value="other">Khác</option>
                                </select>
                            </label>

                            <label className="text-sm text-slate-600">
                                Vai trò *
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(event) => handleChangeFormField('role', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                >
                                    <option value="staff">Nhân viên</option>
                                    <option value="owner" disabled={!isPrimaryAdmin}>Chủ shop</option>
                                </select>
                                {!isPrimaryAdmin ? (
                                    <span className="mt-1 block text-xs text-amber-600">Chỉ admin chính mới tạo tài khoản chủ shop</span>
                                ) : null}
                            </label>

                            <label className="text-sm text-slate-600">
                                Trạng thái
                                <select
                                    value={formData.status}
                                    onChange={(event) => handleChangeFormField('status', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                >
                                    <option value="active">Đang hoạt động</option>
                                    <option value="locked">Đang khóa</option>
                                </select>
                            </label>

                            <label className="text-sm text-slate-600 md:col-span-2">
                                Mật khẩu *
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(event) => handleChangeFormField('password', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                            </label>

                            <div className="md:col-span-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#1975d2] text-white rounded-lg text-sm font-semibold hover:bg-[#145ea8] disabled:opacity-60"
                                >
                                    {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {error ? <div className="owner-alert">{error}</div> : null}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Tổng nhân sự" value={numberFormatter.format(filteredStaff.length)} />
                <StatCard label="Đang hoạt động" value={numberFormatter.format(activeCount)} color="text-green-600" />
                <StatCard label="Đang khóa" value={numberFormatter.format(lockedCount)} color="text-red-600" />
                <StatCard label="Chờ duyệt" value={numberFormatter.format(pendingCount)} color="text-amber-600" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số điện thoại</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vai trò</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedStaff.map((member) => {
                                const status = String(member?.status || '').toLowerCase()
                                const isLocked = status === 'locked'
                                const isPending = status === 'pending'

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={member.avatarUrl || 'https://i.pravatar.cc/150?u=staff'}
                                                    alt={member.name || 'Nhân sự'}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                                />
                                                <p className="text-sm font-semibold text-slate-900">{member.name || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.phone || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 uppercase">{member.role || 'staff'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                isPending
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : (isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')
                                            }`}>
                                                {isPending ? 'Chờ duyệt' : (isLocked ? 'Đang khóa' : 'Đang hoạt động')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    className="p-2 text-slate-400 hover:text-[#1975d2] hover:bg-blue-50 rounded-lg transition-colors"
                                                    onClick={() => handleOpenStaffDetail(member.id)}
                                                    title="Xem chi tiết nhân sự"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                                    onClick={() => handleChangeRole(member)}
                                                    disabled={updatingId === member.id || String(member?.id || '') === String(user?.id || '')}
                                                    title={
                                                        String(member?.id || '') === String(user?.id || '')
                                                            ? 'Không thể tự đổi vai trò của chính bạn'
                                                            : (
                                                                String(member?.role || '').toLowerCase() === 'owner'
                                                                    ? 'Hạ xuống nhân viên'
                                                                    : 'Nâng lên chủ shop'
                                                            )
                                                    }
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-60 ${
                                                        isPending
                                                            ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                                    }`}
                                                    onClick={() => handleToggleStatus(member)}
                                                    disabled={updatingId === member.id}
                                                    title={isPending ? 'Duyệt tài khoản' : (isLocked ? 'Mở khóa nhân sự' : 'Khóa nhân sự')}
                                                >
                                                    {isPending ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {paginatedStaff.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>
                                        Không có nhân sự phù hợp.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredStaff.length > 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <p className="text-sm text-slate-600">
                        Hiển thị {startItemIndex + 1}-{endItemIndex} trên tổng {totalItems} nhân sự
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 text-sm font-medium text-slate-700">
                            Trang {safeCurrentPage}/{totalPages}
                        </span>
                        <button
                            type="button"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : null}

            {showPermissionModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={handleClosePermissionModal}>
                    <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                            <h3 className="text-lg font-bold text-slate-900">Chỉnh quyền nhân sự</h3>
                                <p className="text-sm text-slate-500">{permissionTarget?.name || 'Tài khoản'} ({permissionTarget?.role === 'owner' ? 'Chủ shop' : 'Nhân viên'})</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClosePermissionModal}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                disabled={permissionSaving}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {permissionError ? <div className="owner-alert mb-4">{permissionError}</div> : null}

                        {permissionLoading ? (
                            <div className="text-sm text-slate-500 py-6">Đang tải cấu hình quyền...</div>
                        ) : (
                            <>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={permissionKeyword}
                                        onChange={(event) => setPermissionKeyword(event.target.value)}
                                        placeholder="Tìm quyền..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                                    />
                                </div>

                                <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Quyền</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Thiết lập</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredPermissionCatalog.map((permission) => (
                                                <tr key={permission}>
                                                    <td className="px-4 py-2 text-sm text-slate-700 font-mono">{permission}</td>
                                                    <td className="px-4 py-2 w-56">
                                                        <select
                                                            value={permissionModes[permission] || 'default'}
                                                            onChange={(event) => handlePermissionModeChange(permission, event.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                                        >
                                                            <option value="default">Mặc định theo vai trò</option>
                                                            <option value="allow">Cho phép</option>
                                                            <option value="deny">Từ chối</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredPermissionCatalog.length === 0 ? (
                                                <tr>
                                                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={2}>Không có quyền phù hợp</td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClosePermissionModal}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                                        disabled={permissionSaving}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSavePermissions}
                                        className="px-4 py-2 bg-[#1975d2] text-white rounded-lg text-sm font-semibold hover:bg-[#145ea8] disabled:opacity-60"
                                        disabled={permissionSaving}
                                    >
                                        {permissionSaving ? 'Đang lưu...' : 'Lưu quyền'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            {showDetailModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={handleCloseStaffDetail}>
                    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Chi tiết nhân sự</h3>
                            <button
                                type="button"
                                onClick={handleCloseStaffDetail}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="text-sm text-slate-500 py-6">Đang tải chi tiết nhân sự...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DetailItem label="Tên" value={selectedStaffDetail?.name} />
                                <DetailItem label="Email" value={selectedStaffDetail?.email} />
                                <DetailItem label="Số điện thoại" value={selectedStaffDetail?.phone} />
                                <DetailItem label="Vai trò" value={String(selectedStaffDetail?.role || '').toUpperCase()} />
                                <DetailItem
                                    label="Trạng thái"
                                    value={selectedStaffDetail?.status === 'pending'
                                        ? 'Chờ duyệt'
                                        : (selectedStaffDetail?.status === 'locked' ? 'Đang khóa' : 'Đang hoạt động')}
                                />
                                <DetailItem label="Giới tính" value={selectedStaffDetail?.gender} />
                                <DetailItem label="Ngày sinh" value={selectedStaffDetail?.dateOfBirth ? new Date(selectedStaffDetail.dateOfBirth).toLocaleDateString('vi-VN') : ''} />
                                <DetailItem label="Địa chỉ" value={selectedStaffDetail?.address} className="md:col-span-2" />
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            {selectedStaffDetail?.status === 'pending' ? (
                                <button
                                    type="button"
                                    onClick={handleApproveFromDetail}
                                    disabled={updatingId === selectedStaffDetail?.id}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {updatingId === selectedStaffDetail?.id ? 'Đang duyệt...' : 'Xác nhận tài khoản'}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={handleCloseStaffDetail}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

function DetailItem({ label, value, className = '' }) {
    return (
        <div className={className}>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-sm text-slate-900 mt-1">{value || 'N/A'}</p>
        </div>
    )
}

function StatCard({ label, value, color = 'text-slate-900' }) {
    return (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    )
}


