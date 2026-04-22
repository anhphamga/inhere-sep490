import InventoryInsightTag from './InventoryInsightTag'

const InventoryTable = ({ rows, loading, onRowClick }) => {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Size</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Số lượng tồn</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Đánh giá kho</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Xu hướng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer transition hover:bg-slate-50/80"
                onClick={() => onRowClick?.(item)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
                    <div>
                      <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm text-slate-700">{item.sizeText}</div>
                  {item.sizeAvailableText && item.sizeAvailableText !== item.sizeText && (
                    <div className="mt-0.5 text-[11px] text-emerald-600">Có sẵn: {item.sizeAvailableText}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700" title="Có sẵn">
                      {item.totalAvailable} có sẵn
                    </span>
                    {item.totalReserved > 0 && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700" title="Đã đặt">
                        {item.totalReserved} đặt
                      </span>
                    )}
                    {item.totalRenting > 0 && (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700" title="Đang thuê">
                        {item.totalRenting} đang thuê
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">/ {item.stock} tổng</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <InventoryInsightTag type={item.insightType}>{item.insightLabel}</InventoryInsightTag>
                </td>
                <td className="px-4 py-2 text-sm text-slate-700">{item.trend}</td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Chưa có sản phẩm phù hợp
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default InventoryTable

