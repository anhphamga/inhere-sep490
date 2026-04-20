const styleMap = {
  banChay: 'bg-sky-50 text-sky-700 border-sky-200',
  sapHet: 'bg-amber-50 text-amber-700 border-amber-200',
  tonLau: 'bg-slate-100 text-slate-700 border-slate-200',
  onDinh: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hetHang: 'bg-rose-50 text-rose-700 border-rose-200'
}

const InventoryInsightTag = ({ type, children }) => {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styleMap[type] || styleMap.onDinh}`}>
      {children}
    </span>
  )
}

export default InventoryInsightTag

