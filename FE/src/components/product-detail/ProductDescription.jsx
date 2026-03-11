import { useMemo, useState } from "react";

export default function ProductDescription({ description = "" }) {
  const [expanded, setExpanded] = useState(false);
  const safeText = String(description || "").trim();

  const shouldCollapse = safeText.length > 160;
  const displayText = useMemo(() => {
    if (!shouldCollapse) return safeText || "-";
    return safeText || "-";
  }, [expanded, safeText, shouldCollapse]);

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900">Mô tả sản phẩm </h3>
      <p
        className={`mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700 ${
          shouldCollapse && !expanded
            ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
            : ""
        }`}
      >
        {displayText}
      </p>
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 min-h-11 rounded-2xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          {expanded ? "Thu gon" : "Xem thêm"}
        </button>
      )}
    </section>
  );
}
