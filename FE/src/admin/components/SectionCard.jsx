export default function SectionCard({ title, eyebrow, action, children, className = '' }) {
  return (
    <section className={`rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6 ${className}`}>
      {(title || eyebrow || action) ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p> : null}
            {title ? <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
