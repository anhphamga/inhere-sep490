import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    CalendarDays,
    CheckCircle2,
    Circle,
    Eye,
    Mail,
    MapPin,
    Package,
    Phone,
    RefreshCw,
    Search,
    ShoppingBag,
    Sparkles,
    Truck,
    UserRound
} from 'lucide-react'
import { getOwnerOrdersApi, updateOwnerOrderStatusApi } from '../../services/owner.service'
import { getAllRentOrdersApi } from '../../services/rent-order.service'
import { currencyFormatter, toArray } from '../../utils/owner.utils'

const ORDER_TYPES = {
    sale: 'sale',
    rent: 'rent'
}

const SALE_STATUS_OPTIONS = ['All', 'PendingConfirmation', 'Confirmed', 'Shipping', 'Completed', 'Cancelled', 'Returned', 'Refunded']
const RENT_STATUS_OPTIONS = ['All', 'PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed', 'Late', 'Compensation', 'NoShow', 'Cancelled']

const STATUS_LABELS = {
    Draft: 'Nháp',
    PendingPayment: 'Chờ thanh toán',
    PendingConfirmation: 'Chờ xác nhận',
    Paid: 'Đã thanh toán',
    Confirmed: 'Đã xác nhận',
    Shipping: 'Đang giao',
    Completed: 'Hoàn tất',
    Cancelled: 'Đã hủy',
    Returned: 'Trả hàng',
    Unpaid: 'Chưa thanh toán',
    Failed: 'Thất bại',
    Refunded: 'Đã hoàn tiền',
    PendingDeposit: 'Chờ đặt cọc',
    Deposited: 'Đã đặt cọc',
    WaitingPickup: 'Chờ lấy đồ',
    Renting: 'Đang thuê',
    WaitingReturn: 'Chờ trả đồ',
    Late: 'Trễ hạn',
    Compensation: 'Bồi thường',
    NoShow: 'Không đến nhận'
}

const STATUS_CLASSES = {
    PendingConfirmation: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-sky-100 text-sky-700',
    Shipping: 'bg-violet-100 text-violet-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-rose-100 text-rose-700',
    Returned: 'bg-slate-200 text-slate-700',
    Refunded: 'bg-orange-100 text-orange-700',
    PendingDeposit: 'bg-amber-100 text-amber-700',
    Deposited: 'bg-cyan-100 text-cyan-700',
    WaitingPickup: 'bg-indigo-100 text-indigo-700',
    Renting: 'bg-blue-100 text-blue-700',
    WaitingReturn: 'bg-fuchsia-100 text-fuchsia-700',
    Late: 'bg-red-100 text-red-700',
    Compensation: 'bg-orange-100 text-orange-700',
    NoShow: 'bg-slate-300 text-slate-700'
}

const formatDateTime = (value) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'N/A'
    return parsed.toLocaleString('vi-VN')
}

const getStatusOptions = (orderType) => (orderType === ORDER_TYPES.sale ? SALE_STATUS_OPTIONS : RENT_STATUS_OPTIONS)

const getCustomerName = (order, orderType) => (
    orderType === ORDER_TYPES.sale
        ? (order?.customerId?.name || order?.guestName || 'Khách guest')
        : (order?.customerId?.name || 'Khách thuê')
)

const getCustomerPhone = (order, orderType) => (
    orderType === ORDER_TYPES.sale
        ? (order?.shippingPhone || order?.customerId?.phone || 'N/A')
        : (order?.customerId?.phone || 'N/A')
)

const getPrimaryItemName = (order, orderType) => {
    const items = toArray(order?.items)
    if (items.length === 0) return 'Không có sản phẩm'

    const firstName = orderType === ORDER_TYPES.sale
        ? (items[0]?.productId?.name || 'Sản phẩm')
        : (items[0]?.productInstanceId?.productId?.name || 'Sản phẩm thuê')

    return items.length > 1 ? `${firstName} +${items.length - 1}` : firstName
}

const getOrderAmount = (order) => Number(order?.totalAmount || 0)

const getStatusClassName = (status) => STATUS_CLASSES[status] || 'bg-slate-100 text-slate-700'

const getProductImage = (item, orderType) => {
    if (orderType === ORDER_TYPES.sale) {
        const images = item?.productId?.images
        return Array.isArray(images) && images.length > 0 ? images[0] : ''
    }

    const images = item?.productInstanceId?.productId?.images
    return Array.isArray(images) && images.length > 0 ? images[0] : ''
}

const getTimelineItems = (order, orderType) => {
    if (orderType === ORDER_TYPES.sale) {
        return [
            {
                label: 'Đơn được tạo',
                description: 'Khách hàng đã gửi yêu cầu mua hàng.',
                value: order?.createdAt,
                active: true
            },
            {
                label: 'Chờ xác nhận',
                description: 'Owner hoặc staff kiểm tra và xác nhận đơn.',
                value: ['PendingConfirmation', 'Confirmed', 'Shipping', 'Completed', 'Returned', 'Refunded'].includes(order?.status) ? order?.updatedAt || order?.createdAt : null,
                active: ['PendingConfirmation', 'Confirmed', 'Shipping', 'Completed', 'Returned', 'Refunded'].includes(order?.status)
            },
            {
                label: 'Đang giao hàng',
                description: 'Đơn đã vào giai đoạn chuẩn bị hoặc vận chuyển.',
                value: ['Shipping', 'Completed', 'Returned', 'Refunded'].includes(order?.status) ? order?.updatedAt : null,
                active: ['Shipping', 'Completed', 'Returned', 'Refunded'].includes(order?.status)
            },
            {
                label: 'Hoàn tất',
                description: 'Đơn đã hoàn tất hoặc đã được xử lý sau bán.',
                value: ['Completed', 'Returned', 'Refunded'].includes(order?.status) ? order?.updatedAt : null,
                active: ['Completed', 'Returned', 'Refunded'].includes(order?.status)
            }
        ]
    }

    return [
        {
            label: 'Đơn được tạo',
            description: 'Khách hàng gửi yêu cầu thuê sản phẩm.',
            value: order?.createdAt,
            active: true
        },
        {
            label: 'Đặt cọc',
            description: 'Đơn thuê được xác nhận sau khi hoàn thành đặt cọc.',
            value: ['Deposited', 'Confirmed', 'WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed', 'Late', 'Compensation'].includes(order?.status) ? order?.updatedAt : null,
            active: ['Deposited', 'Confirmed', 'WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed', 'Late', 'Compensation'].includes(order?.status)
        },
        {
            label: 'Nhận đồ',
            description: 'Khách hàng đến nhận hoặc bắt đầu kỳ thuê.',
            value: order?.pickupAt || order?.rentStartDate,
            active: ['WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed', 'Late', 'Compensation'].includes(order?.status)
        },
        {
            label: 'Trả đồ / hoàn tất',
            description: 'Kết thúc kỳ thuê và chốt tình trạng đơn.',
            value: order?.completedAt || order?.returnedAt || order?.rentEndDate,
            active: ['Returned', 'Completed', 'Late', 'Compensation'].includes(order?.status)
        }
    ]
}

function DetailInfoRow({ icon, label, value, fullWidth = false }) {
    const IconComponent = icon

    return (
        <div className={`flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ${fullWidth ? 'sm:col-span-2' : ''}`}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-100">
                <IconComponent className="h-4 w-4" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-800">{value || 'N/A'}</p>
            </div>
        </div>
    )
}

function SummaryTile({ label, value, tone = 'text-slate-900' }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{label}</p>
            <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
        </div>
    )
}

function TypeTab({ active, icon, label, description, onClick }) {
    const IconComponent = icon

    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
                active ? 'border-[#1975d2] bg-[#1975d2]/8 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
        >
            <div className="flex items-start gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-[#1975d2] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <IconComponent className="h-4 w-4" />
                </span>
                <div>
                    <p className="font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
            </div>
        </button>
    )
}

export default function OrdersList() {
    const [orderType, setOrderType] = useState(ORDER_TYPES.sale)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [searchValue, setSearchValue] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [savingStatus, setSavingStatus] = useState(false)

    useEffect(() => {
        setStatusFilter('All')
        setSearchValue('')
        setSelectedOrder(null)
    }, [orderType])

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            if (orderType === ORDER_TYPES.sale) {
                const response = await getOwnerOrdersApi({
                    status: statusFilter === 'All' ? '' : statusFilter,
                    keyword: searchValue.trim(),
                    limit: 100
                })
                setOrders(toArray(response?.data))
                return
            }

            const response = await getAllRentOrdersApi({
                status: statusFilter === 'All' ? '' : statusFilter,
                limit: 100
            })

            const rows = toArray(response?.data)
            const keyword = searchValue.trim().toLowerCase()
            const filteredRows = keyword
                ? rows.filter((order) => {
                    const customerName = String(order?.customerId?.name || '').toLowerCase()
                    const customerPhone = String(order?.customerId?.phone || '').toLowerCase()
                    const orderId = String(order?._id || '').toLowerCase()
                    const itemNames = toArray(order?.items)
                        .map((item) => String(item?.productInstanceId?.productId?.name || ''))
                        .join(' ')
                        .toLowerCase()

                    return (
                        customerName.includes(keyword) ||
                        customerPhone.includes(keyword) ||
                        orderId.includes(keyword) ||
                        itemNames.includes(keyword)
                    )
                })
                : rows

            setOrders(filteredRows)
        } catch (apiError) {
            setError(
                apiError?.response?.data?.message ||
                apiError?.message ||
                (orderType === ORDER_TYPES.sale ? 'Không tải được danh sách đơn mua' : 'Không tải được danh sách đơn thuê')
            )
        } finally {
            setLoading(false)
        }
    }, [orderType, searchValue, statusFilter])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadOrders()
        }, 250)

        return () => window.clearTimeout(timer)
    }, [loadOrders])

    const stats = useMemo(() => {
        return orders.reduce((acc, order) => {
            acc.total += 1
            acc.amount += getOrderAmount(order)

            if (orderType === ORDER_TYPES.sale && order?.status === 'PendingConfirmation') acc.pending += 1
            if (orderType === ORDER_TYPES.sale && order?.status === 'Shipping') acc.processing += 1
            if (orderType === ORDER_TYPES.rent && ['PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup'].includes(order?.status)) acc.pending += 1
            if (orderType === ORDER_TYPES.rent && ['Renting', 'WaitingReturn', 'Late'].includes(order?.status)) acc.processing += 1

            return acc
        }, { total: 0, amount: 0, pending: 0, processing: 0 })
    }, [orderType, orders])

    const handleUpdateSaleStatus = async (nextStatus) => {
        if (orderType !== ORDER_TYPES.sale || !selectedOrder?._id || !nextStatus || nextStatus === selectedOrder.status) {
            return
        }

        try {
            setSavingStatus(true)
            setError('')
            const response = await updateOwnerOrderStatusApi(selectedOrder._id, nextStatus)
            const updatedOrder = response?.data

            setSelectedOrder(updatedOrder)
            setOrders((prev) => prev.map((order) => (
                order._id === updatedOrder._id ? updatedOrder : order
            )))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được trạng thái đơn mua')
        } finally {
            setSavingStatus(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
                <TypeTab
                    active={orderType === ORDER_TYPES.sale}
                    icon={ShoppingBag}
                    label="Đơn mua"
                    description="Quản lý đơn mua của guest và khách đã đăng nhập."
                    onClick={() => setOrderType(ORDER_TYPES.sale)}
                />
                <TypeTab
                    active={orderType === ORDER_TYPES.rent}
                    icon={Package}
                    label="Đơn thuê"
                    description="Theo dõi toàn bộ đơn thuê và trạng thái vận hành hiện tại."
                    onClick={() => setOrderType(ORDER_TYPES.rent)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {orderType === ORDER_TYPES.sale ? 'Tổng đơn mua' : 'Tổng đơn thuê'}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {orderType === ORDER_TYPES.sale ? 'Chờ xác nhận' : 'Chờ xử lý'}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {orderType === ORDER_TYPES.sale ? 'Đang giao' : 'Đang vận hành'}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-violet-600">{stats.processing}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {orderType === ORDER_TYPES.sale ? 'Doanh thu hiển thị' : 'Giá trị đơn thuê'}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{currencyFormatter.format(stats.amount)}</p>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder={orderType === ORDER_TYPES.sale
                                    ? 'Tìm theo mã đơn, khách hàng, số điện thoại, sản phẩm...'
                                    : 'Tìm theo mã đơn thuê, khách hàng, số điện thoại, sản phẩm...'}
                                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/30"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
                        >
                            {getStatusOptions(orderType).map((status) => (
                                <option key={status} value={status}>
                                    {status === 'All' ? 'Tất cả trạng thái' : STATUS_LABELS[status] || status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={loadOrders}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Làm mới
                    </button>
                </div>

                {error ? <div className="mx-5 mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mã đơn</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Khách hàng</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Giá trị</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td className="px-5 py-8 text-slate-500" colSpan={7}>
                                        {orderType === ORDER_TYPES.sale ? 'Đang tải đơn mua...' : 'Đang tải đơn thuê...'}
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && orders.length === 0 ? (
                                <tr>
                                    <td className="px-5 py-8 text-slate-500" colSpan={7}>
                                        {orderType === ORDER_TYPES.sale ? 'Chưa có đơn mua nào phù hợp.' : 'Chưa có đơn thuê nào phù hợp.'}
                                    </td>
                                </tr>
                            ) : null}

                            {!loading && orders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-50/70">
                                    <td className="px-5 py-4 font-semibold text-[#1975d2]">#{String(order._id).slice(-8)}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-medium text-slate-900">{getCustomerName(order, orderType)}</div>
                                        <div className="text-xs text-slate-500">{getCustomerPhone(order, orderType)}</div>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">{getPrimaryItemName(order, orderType)}</td>
                                    <td className="px-5 py-4 text-slate-600">{formatDateTime(order.createdAt)}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(order.status)}`}>
                                            {STATUS_LABELS[order.status] || order.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-semibold text-slate-900">{currencyFormatter.format(getOrderAmount(order))}</td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedOrder(order)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Xem
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedOrder ? (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6 sm:px-6">
                    <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
                        <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
                            <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(25,117,210,0.16),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 sm:px-7">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#1975d2] shadow-sm backdrop-blur">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            {orderType === ORDER_TYPES.sale ? 'Đơn mua' : 'Đơn thuê'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                                                {orderType === ORDER_TYPES.sale ? 'Đơn mua' : 'Đơn thuê'} #{String(selectedOrder._id).slice(-8)}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500">Tạo lúc {formatDateTime(selectedOrder.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold ${getStatusClassName(selectedOrder.status)}`}>
                                            {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedOrder(null)}
                                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
                                <div className="space-y-6">
                                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-[#1975d2]/10 p-3 text-[#1975d2]">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-900">Thông tin khách hàng</h4>
                                                <p className="text-sm text-slate-500">Chi tiết liên hệ và thông tin nhận đơn.</p>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                            <DetailInfoRow
                                                icon={UserRound}
                                                label="Khách hàng"
                                                value={getCustomerName(selectedOrder, orderType)}
                                            />
                                            <DetailInfoRow
                                                icon={Phone}
                                                label="Điện thoại"
                                                value={getCustomerPhone(selectedOrder, orderType)}
                                            />
                                            <DetailInfoRow
                                                icon={Mail}
                                                label="Email"
                                                value={selectedOrder.guestEmail || selectedOrder.customerId?.email || 'N/A'}
                                            />
                                            <DetailInfoRow
                                                icon={MapPin}
                                                label={orderType === ORDER_TYPES.sale ? 'Địa chỉ giao hàng' : 'Địa chỉ liên hệ'}
                                                value={orderType === ORDER_TYPES.sale ? (selectedOrder.shippingAddress || 'N/A') : (selectedOrder.customerId?.address || 'N/A')}
                                                fullWidth
                                            />
                                        </div>
                                    </section>

                                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-900">Sản phẩm trong đơn</h4>
                                                <p className="text-sm text-slate-500">
                                                    {toArray(selectedOrder.items).length} sản phẩm đang được xử lý trong đơn này.
                                                </p>
                                            </div>
                                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                Sản phẩm
                                            </div>
                                        </div>

                                        <div className="mt-5 space-y-4">
                                            {toArray(selectedOrder.items).map((item) => {
                                                const productName = orderType === ORDER_TYPES.sale
                                                    ? (item.productId?.name || 'Sản phẩm')
                                                    : (item.productInstanceId?.productId?.name || 'Sản phẩm thuê')
                                                const variantText = [
                                                    item.size ? `Size ${item.size}` : null,
                                                    item.color ? `Màu ${item.color}` : null,
                                                    orderType === ORDER_TYPES.sale ? `SL ${item.quantity || 0}` : null
                                                ].filter(Boolean).join(' • ')
                                                const lineTotal = orderType === ORDER_TYPES.sale
                                                    ? ((item.unitPrice || 0) * (item.quantity || 0))
                                                    : (item.finalPrice || item.baseRentPrice || 0)
                                                const image = getProductImage(item, orderType)

                                                return (
                                                    <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4 sm:p-5">
                                                        <div className="flex flex-col gap-4 sm:flex-row">
                                                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                                                                {image ? (
                                                                    <img
                                                                        src={image}
                                                                        alt={productName}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Package className="h-7 w-7 text-slate-300" />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div className="min-w-0">
                                                                        <p className="text-base font-semibold text-slate-900">{productName}</p>
                                                                        <p className="mt-1 text-sm text-slate-500">{variantText || 'Chưa có thông tin phiên bản'}</p>
                                                                        {orderType === ORDER_TYPES.rent ? (
                                                                            <p className="mt-2 text-sm text-slate-500">
                                                                                Giá thuê: {currencyFormatter.format(item.finalPrice || item.baseRentPrice || 0)}
                                                                            </p>
                                                                        ) : null}
                                                                        {item.note ? (
                                                                            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
                                                                                Ghi chú: {item.note}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>

                                                                    <div className="rounded-2xl bg-white px-4 py-3 text-right ring-1 ring-slate-200">
                                                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Thành tiền</p>
                                                                        <p className="mt-1 text-base font-bold text-slate-900">
                                                                            {currencyFormatter.format(lineTotal)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-lg font-semibold">Tóm tắt đơn hàng</h4>
                                                <p className="mt-1 text-sm text-slate-300">Thông tin tài chính và xử lý chính.</p>
                                            </div>
                                            <div className="rounded-2xl bg-white/10 p-3 text-slate-100">
                                                <Truck className="h-5 w-5" />
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                            <SummaryTile
                                                label="Tổng giá trị"
                                                value={currencyFormatter.format(selectedOrder.totalAmount || 0)}
                                                tone="text-white"
                                            />
                                            {orderType === ORDER_TYPES.sale ? (
                                                <SummaryTile
                                                    label="Phí vận chuyển"
                                                    value={currencyFormatter.format(selectedOrder.shippingFee || 0)}
                                                    tone="text-slate-100"
                                                />
                                            ) : (
                                                <SummaryTile
                                                    label="Tiền đặt cọc"
                                                    value={currencyFormatter.format(selectedOrder.depositAmount || 0)}
                                                    tone="text-slate-100"
                                                />
                                            )}
                                            {orderType === ORDER_TYPES.sale ? (
                                                <SummaryTile
                                                    label="Thanh toán"
                                                    value={selectedOrder.paymentMethod || 'N/A'}
                                                    tone="text-slate-100"
                                                />
                                            ) : (
                                                <SummaryTile
                                                    label="Còn lại"
                                                    value={currencyFormatter.format(selectedOrder.remainingAmount || 0)}
                                                    tone="text-slate-100"
                                                />
                                            )}
                                            <SummaryTile
                                                label="Người xử lý"
                                                value={selectedOrder.staffId?.name || 'Chưa gán'}
                                                tone="text-slate-100"
                                            />
                                        </div>
                                    </section>

                                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                                                <CalendarDays className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-900">Tiến trình đơn hàng</h4>
                                                <p className="text-sm text-slate-500">Theo dõi các mốc trạng thái chính của đơn.</p>
                                            </div>
                                        </div>

                                        <div className="mt-5 space-y-4">
                                            {getTimelineItems(selectedOrder, orderType).map((item, index, timelineItems) => {
                                                const TimelineIcon = item.active ? CheckCircle2 : Circle

                                                return (
                                                    <div key={`${item.label}-${index}`} className="flex items-start gap-3">
                                                        <div className="relative flex flex-col items-center">
                                                            <div className={`rounded-full p-1.5 ${item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                <TimelineIcon className="h-4 w-4" />
                                                            </div>
                                                            {index < timelineItems.length - 1 ? (
                                                                <div className={`mt-1 h-10 w-px ${item.active ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                                                            ) : null}
                                                        </div>

                                                        <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className={`font-semibold ${item.active ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</p>
                                                                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                                                                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                                                        {item.value ? formatDateTime(item.value) : 'Chưa tới bước này'}
                                                                    </p>
                                                                </div>
                                                                {item.active ? (
                                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                        Hiện tại
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>

                                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-900">
                                                {orderType === ORDER_TYPES.sale ? 'Cập nhật trạng thái' : 'Ghi chú vận hành'}
                                            </h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {orderType === ORDER_TYPES.sale
                                                    ? 'Chọn nhanh trạng thái tiếp theo cho đơn mua.'
                                                    : 'Đơn thuê đang được theo dõi tổng quan trong dashboard owner.'}
                                            </p>
                                        </div>

                                        {orderType === ORDER_TYPES.sale ? (
                                            <div className="mt-5 space-y-4">
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {SALE_STATUS_OPTIONS.filter((item) => item !== 'All').map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            disabled={savingStatus || status === selectedOrder.status}
                                                            onClick={() => handleUpdateSaleStatus(status)}
                                                            className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                                                                status === selectedOrder.status
                                                                    ? 'border-[#1975d2] bg-[#1975d2]/8 text-[#1975d2]'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                            } ${savingStatus ? 'cursor-not-allowed opacity-70' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>{STATUS_LABELS[status] || status}</span>
                                                                {status === selectedOrder.status ? <CheckCircle2 className="h-4 w-4" /> : null}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-slate-700">Chọn từ danh sách</label>
                                                    <select
                                                        value={selectedOrder.status || 'PendingConfirmation'}
                                                        onChange={(event) => handleUpdateSaleStatus(event.target.value)}
                                                        disabled={savingStatus}
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-4 focus:ring-[#1975d2]/10"
                                                    >
                                                        {SALE_STATUS_OPTIONS.filter((item) => item !== 'All').map((status) => (
                                                            <option key={status} value={status}>
                                                                {STATUS_LABELS[status] || status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {savingStatus ? <p className="mt-2 text-xs text-slate-500">Đang cập nhật trạng thái...</p> : null}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                                                Màn này giúp owner xem nhanh khách hàng, timeline và giá trị đơn thuê. Những bước vận hành chuyên sâu của đơn thuê vẫn đi theo quy trình riêng của staff hoặc owner.
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
