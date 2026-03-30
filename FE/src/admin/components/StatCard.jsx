export default function StatCard({ label, value, hint, accent = 'from-slate-900 to-slate-700' }) {
  return (
    <div className={`rounded-[28px] bg-gradient-to-br ${accent} p-[1px] shadow-[0_18px_46px_rgba(15,23,42,0.16)]`}>
      <div className="rounded-[27px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] p-5 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-white/60">{label}</p>
        <p className="mt-4 text-3xl font-semibold">{value}</p>
        {hint ? <p className="mt-2 text-sm text-white/70">{hint}</p> : null}
      </div>
    </div>
  );
}
