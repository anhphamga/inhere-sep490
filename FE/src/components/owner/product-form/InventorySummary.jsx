const instanceStatus = (instance = {}) =>
    String(instance.lifecycleStatus || instance.status || '').trim()

export default function InventorySummary({ totalQuantity = 0, rentedCount = 0, actualInstances = [] }) {
    // From form (user input)
    const formTotal = Math.max(Number(totalQuantity) || 0, 0)
    const formRented = Math.max(Number(rentedCount) || 0, 0)
    const formAvailable = Math.max(formTotal - formRented, 0)

    // From database (instances) — API có thể trả `status` hoặc `lifecycleStatus`
    const dbTotal = actualInstances.length
    const dbAvailable = actualInstances.filter((i) => instanceStatus(i) === 'Available').length
    const dbRented = actualInstances.filter((i) => instanceStatus(i) === 'Rented').length
    const dbHeld = actualInstances.filter((i) =>
        ['Reserved', 'ReservedForPayment', 'Washing', 'Repair'].includes(instanceStatus(i))
    ).length

    // Status indicator
    const isInSync = formTotal === dbTotal

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Tồn kho</h4>
            
            {/* Database (Source of Truth) */}
            <div className="pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <ReadonlyStat label="Tổng đang quản lí" value={dbTotal} />
                    <ReadonlyStat label="Có sẵn (chưa bán)" value={dbAvailable} />
                    <ReadonlyStat label="Đang thuê" value={dbRented} />
                    <ReadonlyStat label="Giữ / giặt / sửa" value={dbHeld} />
                </div>
            </div>

            {/* Form Input (User's intended change) */}
            {formTotal > 0 && !isInSync && (
                <div className="pt-2 border-t border-slate-200 bg-slate-50 p-3 rounded">
                    <p className="text-xs text-slate-600 mb-2">📝 Dữ liệu từ Form (thay dổi dự kiến)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ReadonlyStat label="Tổng theo form" value={formTotal} />
                        <ReadonlyStat label="Theo form: đang thuê (ước tính)" value={formRented} />
                        <ReadonlyStat label="Còn lại theo form" value={formAvailable} />
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                        ⍰ Chênh lệch: {formTotal > dbTotal ? '+' : ''}{formTotal - dbTotal} instances
                    </p>
                </div>
            )}

            {isInSync && formTotal > 0 && (
                <div className="text-xs text-emerald-600 text-center py-1">✓ Dữ liệu đã đồng bộ</div>
            )}
        </section>
    )
}


function ReadonlyStat({ label, value }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{label}</p>
            <p className="text-base font-semibold text-slate-900">{value}</p>
        </div>
    )
}
