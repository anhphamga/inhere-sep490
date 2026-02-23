import { useEffect, useMemo, useState } from 'react'
import { Lock, Search, Unlock } from 'lucide-react'
import { getOwnerCustomersApi, updateOwnerCustomerStatusApi } from '../../services/owner.service'
import { toArray } from './owner.utils'

const statusPillClass = {
    active: 'text-green-600 bg-green-50',
    locked: 'text-red-600 bg-red-50'
}

export default function UsersList({ onSelectUser }) {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [updatingId, setUpdatingId] = useState('')

    const loadCustomers = async (status = statusFilter) => {
        try {
            setLoading(true)
            setError('')

            const response = await getOwnerCustomersApi(status ? { status } : {})
            setCustomers(toArray(response?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh sách khách hàng')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCustomers()
    }, [])

    const filteredCustomers = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        if (!keyword) {
            return customers
        }

        return customers.filter((item) => {
            const name = String(item?.name || '').toLowerCase()
            const email = String(item?.email || '').toLowerCase()
            const phone = String(item?.phone || '').toLowerCase()
            return name.includes(keyword) || email.includes(keyword) || phone.includes(keyword)
        })
    }, [customers, search])

    const handleChangeStatus = async (user, nextStatus) => {
        try {
            setUpdatingId(user.id)
            await updateOwnerCustomerStatusApi(user.id, nextStatus)
            await loadCustomers()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được trạng thái khách hàng')
        } finally {
            setUpdatingId('')
        }
    }

    const handleFilterChange = async (value) => {
        setStatusFilter(value)
        await loadCustomers(value)
    }

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải danh sách khách hàng...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm theo tên, email, số điện thoại..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                        />
                    </div>

                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-[#1975d2] outline-none min-w-37.5"
                        value={statusFilter}
                        onChange={(event) => handleFilterChange(event.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Đang khóa</option>
                    </select>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số điện thoại</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.map((user) => {
                                const status = user?.status || 'active'
                                const isLocked = status === 'locked'

                                return (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => onSelectUser(user.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatarUrl || 'https://i.pravatar.cc/150?u=customer'}
                                                    alt={user.name || 'Customer'}
                                                    className="w-9 h-9 rounded-full object-cover"
                                                />
                                                <span className="font-medium text-slate-900">{user.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.email || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.phone || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusPillClass[status] || statusPillClass.active}`}>
                                                {status === 'locked' ? 'Đang khóa' : 'Đang hoạt động'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-[#1975d2] transition-colors"
                                                    onClick={() => handleChangeStatus(user, isLocked ? 'active' : 'locked')}
                                                    disabled={updatingId === user.id}
                                                    title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                                >
                                                    {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                                        Không có khách hàng phù hợp.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
