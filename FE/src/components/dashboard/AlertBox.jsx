import { AlertTriangle } from 'lucide-react'

const AlertBox = ({ alerts }) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[#0F9D58]" />
        <h3 className="text-base font-semibold text-slate-900">Cảnh báo cần xử lý</h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div key={`${alert}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50/50">
            {alert}
          </div>
        ))}
      </div>
    </section>
  )
}

export default AlertBox
