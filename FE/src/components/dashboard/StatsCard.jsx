import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

const StatsCard = ({ title, value, trend, subtitle, icon: Icon }) => {
  const IconComponent = Icon
  const normalizedTrend = Number.isFinite(Number(trend)) ? Number(trend) : 0
  const isPositive = normalizedTrend >= 0

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-2 text-[#0F9D58]">
          <IconComponent className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{isPositive ? '+' : ''}{normalizedTrend}%</span>
        </div>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </article>
  )
}

export default StatsCard
