const statusColorMap = {
  tong: 'border-slate-200 bg-slate-50 text-slate-700',
  low: 'border-amber-200 bg-amber-50 text-amber-700',
  out: 'border-rose-200 bg-rose-50 text-rose-700',
  hot: 'border-sky-200 bg-sky-50 text-sky-700'
}

const InventoryKPI = ({ items, activeKey, onCardClick }) => {
  return (
    <section className="grid grid-cols-12 gap-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onCardClick?.(item.key)}
          className={`col-span-12 h-full min-h-[124px] rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:col-span-6 xl:col-span-3 ${statusColorMap[item.key] || statusColorMap.tong} ${activeKey === item.key ? 'ring-2 ring-[#1975d2]/40' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 shadow-sm">
              <item.icon className="h-5 w-5" />
            </div>
          </div>
        </button>
      ))}
    </section>
  )
}

export default InventoryKPI
