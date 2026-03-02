import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, BarChart2, Calendar, Eye, Search, UserPlus, X } from 'lucide-react'
import { createOwnerStaffApi, getOwnerStaffApi, getOwnerStaffDetailApi, updateOwnerStaffStatusApi } from '../../services/owner.service'
import { numberFormatter, toArray } from './owner.utils'

export default function StaffList({ onViewCalendar, onViewAnalytics }) {
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [search, setSearch] = useState('')
    const [updatingId, setUpdatingId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [selectedStaffDetail, setSelectedStaffDetail] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        gender: '',
        status: 'active'
    })

    const loadStaff = useCallback(async (status = '') => {
        try {
            setLoading(true)
            setError('')
            const response = await getOwnerStaffApi(status ? { status } : {})
            setStaff(toArray(response?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách staff')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadStaff('')
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

    const activeCount = useMemo(() => filteredStaff.filter((item) => item?.status === 'active').length, [filteredStaff])
    const lockedCount = useMemo(() => filteredStaff.filter((item) => item?.status === 'locked').length, [filteredStaff])

    const handleFilterChange = async (value) => {
        setStatusFilter(value)
        await loadStaff(value)
    }

    const handleToggleStatus = async (member) => {
        try {
            const nextStatus = member?.status === 'locked' ? 'active' : 'locked'
            setUpdatingId(member.id)
            await updateOwnerStaffStatusApi(member.id, nextStatus)
            await loadStaff()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được trạng thái staff')
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
                status: formData.status
            })

            resetCreateForm()
            setShowCreateForm(false)
            await loadStaff()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tạo được staff mới')
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

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải danh sách staff...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm theo tên/email/sđt..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                        />
                    </div>

                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-[#1975d2] outline-none min-w-35"
                        value={statusFilter}
                        onChange={(event) => handleFilterChange(event.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Đang khóa</option>
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
                    Add Staff
                </button>
            </div>

            {showCreateForm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={handleCloseCreateModal}>
                    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Add Staff</h3>
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
                                Tên staff *
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(event) => handleChangeFormField('name', event.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 outline-none"
                                    placeholder="Nhập tên staff"
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
                                    {submitting ? 'Đang tạo...' : 'Tạo staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {error ? <div className="owner-alert">{error}</div> : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Tổng staff" value={numberFormatter.format(filteredStaff.length)} />
                <StatCard label="Đang hoạt động" value={numberFormatter.format(activeCount)} color="text-green-600" />
                <StatCard label="Đang khóa" value={numberFormatter.format(lockedCount)} color="text-red-600" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên staff</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số điện thoại</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStaff.map((member) => {
                                const isLocked = member.status === 'locked'

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={member.avatarUrl || 'https://i.pravatar.cc/150?u=staff'}
                                                    alt={member.name || 'Staff'}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                                />
                                                <p className="text-sm font-semibold text-slate-900">{member.name || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.phone || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {isLocked ? 'Đang khóa' : 'Đang hoạt động'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    className="p-2 text-slate-400 hover:text-[#1975d2] hover:bg-blue-50 rounded-lg transition-colors"
                                                    onClick={() => handleOpenStaffDetail(member.id)}
                                                    title="Xem chi tiết staff"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                                                    onClick={() => handleToggleStatus(member)}
                                                    disabled={updatingId === member.id}
                                                    title={isLocked ? 'Mở khóa staff' : 'Khóa staff'}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                                        Không có staff phù hợp.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {showDetailModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={handleCloseStaffDetail}>
                    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Chi tiết staff</h3>
                            <button
                                type="button"
                                onClick={handleCloseStaffDetail}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="text-sm text-slate-500 py-6">Đang tải chi tiết staff...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DetailItem label="Tên staff" value={selectedStaffDetail?.name} />
                                <DetailItem label="Email" value={selectedStaffDetail?.email} />
                                <DetailItem label="Số điện thoại" value={selectedStaffDetail?.phone} />
                                <DetailItem label="Trạng thái" value={selectedStaffDetail?.status === 'locked' ? 'Đang khóa' : 'Đang hoạt động'} />
                                <DetailItem label="Giới tính" value={selectedStaffDetail?.gender} />
                                <DetailItem label="Ngày sinh" value={selectedStaffDetail?.dateOfBirth ? new Date(selectedStaffDetail.dateOfBirth).toLocaleDateString('vi-VN') : ''} />
                                <DetailItem label="Địa chỉ" value={selectedStaffDetail?.address} className="md:col-span-2" />
                            </div>
                        )}

                        <div className="mt-5 flex justify-end">
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
