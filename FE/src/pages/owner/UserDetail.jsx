import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Phone, UserCircle } from 'lucide-react'
import { getOwnerCustomerDetailApi, updateOwnerCustomerStatusApi } from '../../services/owner.service'
import { currencyFormatter, numberFormatter, toArray } from './owner.utils'

const formatDateTime = (value) => {
    if (!value) {
        return 'N/A'
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return 'N/A'
    }

    return parsed.toLocaleString('vi-VN')
}

const mapRentOrder = (order) => ({
    id: order?._id || order?.id,
    type: 'Rent',
    code: order?.orderCode || order?._id || 'N/A',
    status: order?.status || 'N/A',
    amount: Number(order?.totalAmount || 0),
    createdAt: order?.createdAt,
    closedAt: order?.actualReturnDate || order?.returnDate
})

const mapSaleOrder = (order) => ({
    id: order?._id || order?.id,
    type: 'Sale',
    code: order?.orderCode || order?._id || 'N/A',
    status: order?.status || 'N/A',
    amount: Number(order?.totalAmount || 0),
    createdAt: order?.createdAt,
    closedAt: order?.createdAt
})

export default function UserDetail({ userId }) {
    const [payload, setPayload] = useState({ customer: null, rentOrders: [], saleOrders: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [updating, setUpdating] = useState(false)

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const response = await getOwnerCustomerDetailApi(userId)
            const data = response?.data || {}
            setPayload({
                customer: data?.customer || null,
                rentOrders: toArray(data?.rentOrders),
                saleOrders: toArray(data?.saleOrders)
            })
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được chi tiết khách hàng')
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        if (userId) {
            loadDetail()
        }
    }, [userId, loadDetail])

    const transactions = useMemo(() => {
        const merged = [
            ...payload.rentOrders.map(mapRentOrder),
            ...payload.saleOrders.map(mapSaleOrder)
        ]
        return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }, [payload.rentOrders, payload.saleOrders])

    const totalSpend = useMemo(
        () => transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [transactions]
    )

    const handleToggleStatus = async () => {
        try {
            if (!payload.customer?.id) {
                return
            }

            const nextStatus = payload.customer.status === 'locked' ? 'active' : 'locked'
            setUpdating(true)
            await updateOwnerCustomerStatusApi(payload.customer.id, nextStatus)
            await loadDetail()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được trạng thái khách hàng')
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải chi tiết khách hàng...</div>
    }

    if (!payload.customer) {
        return <div className="owner-alert">Không tìm thấy khách hàng.</div>
    }

    const customer = payload.customer
    const isLocked = customer.status === 'locked'

    return (
        <div className="grid grid-cols-12 gap-8 max-w-7xl mx-auto">
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 text-center border-b border-slate-50">
                        <img
                            src={customer.avatarUrl || 'https://i.pravatar.cc/150?u=customer-profile'}
                            alt={customer.name || 'Customer'}
                            className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm mx-auto"
                        />
                        <h2 className="mt-4 text-xl font-bold text-slate-900">{customer.name || 'N/A'}</h2>
                        <p className="text-slate-500 text-sm">ID: {customer.id}</p>
                    </div>

                    <div className="p-6 space-y-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                            <UserCircle className="w-4 h-4" />
                            <span>{customer.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4" />
                            <span>{customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <MapPin className="w-4 h-4" />
                            <span>{customer.address || 'N/A'}</span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Trạng thái</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isLocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {isLocked ? 'Đang khóa' : 'Đang hoạt động'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleStatus}
                                disabled={updating}
                                className="w-full py-2.5 bg-[#1975d2]/10 text-[#1975d2] font-semibold rounded-lg hover:bg-[#1975d2]/20 transition-colors disabled:opacity-60"
                            >
                                {isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            </button>
                        </div>

                        {error ? <div className="owner-alert">{error}</div> : null}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-400 font-bold uppercase">Tổng đơn</p>
                        <p className="text-xl font-bold mt-1">{numberFormatter.format(transactions.length)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-400 font-bold uppercase">Tổng chi tiêu</p>
                        <p className="text-xl font-bold mt-1">{currencyFormatter.format(totalSpend)}</p>
                    </div>
                </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Lịch sử đơn hàng</h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100">
                                    <th className="py-3 pr-4">Mã đơn</th>
                                    <th className="py-3 pr-4">Loại</th>
                                    <th className="py-3 pr-4">Trạng thái</th>
                                    <th className="py-3 pr-4">Ngày tạo</th>
                                    <th className="py-3 pr-4">Ngày hoàn tất</th>
                                    <th className="py-3 text-right">Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                {transactions.map((tx) => (
                                    <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 pr-4 font-medium">{tx.code}</td>
                                        <td className="py-3 pr-4">{tx.type}</td>
                                        <td className="py-3 pr-4">{tx.status}</td>
                                        <td className="py-3 pr-4 text-slate-500">{formatDateTime(tx.createdAt)}</td>
                                        <td className="py-3 pr-4 text-slate-500">{formatDateTime(tx.closedAt)}</td>
                                        <td className="py-3 text-right font-semibold">{currencyFormatter.format(tx.amount)}</td>
                                    </tr>
                                ))}
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td className="py-4 text-slate-500" colSpan={6}>
                                            Khách hàng chưa có giao dịch.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
