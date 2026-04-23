import { useEffect, useMemo, useRef, useState } from "react";

const TABS = [
  { key: "description", label: "Mô tả" },
  { key: "policy", label: "Chính sách thuê" },
  { key: "size", label: "Bảng size" },
];

const SIZE_ORDER = ['S', 'M', 'L', 'XL']

const formatRange = (minValue, maxValue) => {
  const minNum = Number(minValue)
  const maxNum = Number(maxValue)
  if (!Number.isFinite(minNum) || !Number.isFinite(maxNum)) return '--'
  return `${minNum}-${maxNum}`
}

const formatOptional = (value) => {
  if (value === null || value === undefined || value === '') return '--'
  const num = Number(value)
  return Number.isFinite(num) ? String(num) : '--'
}

const formatRecommendationSource = (source) => {
  return String(source || '').toLowerCase() === 'product' ? 'size riêng sản phẩm' : 'size global'
}

export default function ProductDescription({
  description = "",
  sizeGuideRows = [],
  sizeGuideSource = 'global',
  selectedGender = 'female',
  onGenderChange,
  sizeRecommendationInput = { heightCm: '', weightKg: '' },
  onSizeRecommendationInputChange,
  onRecommendSize,
  sizeRecommendationResult = null,
  sizeRecommendationError = '',
  sizeRecommendationLoading = false,
}) {
  const [tab, setTab] = useState("description");
  const [expanded, setExpanded] = useState(false);
  const sizeSectionRef = useRef(null);
  const safeText = String(description || "").trim();
  const shouldCollapse = safeText.length > 280;
  const sortedSizeRows = useMemo(() => (
    (Array.isArray(sizeGuideRows) ? sizeGuideRows : []).slice().sort((a, b) => {
      return SIZE_ORDER.indexOf(String(a?.sizeLabel || '').toUpperCase()) - SIZE_ORDER.indexOf(String(b?.sizeLabel || '').toUpperCase())
    })
  ), [sizeGuideRows])

  const displayText = useMemo(() => {
    if (!shouldCollapse || expanded) return safeText || "Chưa có mô tả.";
    return `${safeText.slice(0, 280)}...`;
  }, [expanded, safeText, shouldCollapse]);

  useEffect(() => {
    const handleOpenSizeGuide = () => {
      setTab('size');
      requestAnimationFrame(() => {
        sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    window.addEventListener('open-size-guide', handleOpenSizeGuide);
    return () => {
      window.removeEventListener('open-size-guide', handleOpenSizeGuide);
    };
  }, []);

  return (
    <section>
      <div className="flex gap-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative pb-3 text-sm font-semibold transition ${
              tab === t.key
                ? "text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "description" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Về sản phẩm</h3>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-600">
              {displayText}
            </p>
            {shouldCollapse && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-3 text-sm font-medium text-slate-500 underline hover:text-slate-700"
              >
                {expanded ? "Thu gọn" : "Xem thêm"}
              </button>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Cách thuê hoạt động</h4>
            <ol className="mt-4 space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">1</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Thuê 4 ngày</p>
                  <p className="text-[13px] text-slate-500">Nhận trước 2 ngày, trả sau sự kiện 1 ngày.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">2</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Giặt hấp miễn phí</p>
                  <p className="text-[13px] text-slate-500">Dịch vụ giặt hấp bao gồm trong mỗi đơn thuê.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">3</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Đổi trả dễ dàng</p>
                  <p className="text-[13px] text-slate-500">Nhãn vận chuyển trả hàng đã được chuẩn bị sẵn.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {tab === "policy" && (
        <div className="mt-6 max-w-2xl space-y-3 text-[15px] leading-7 text-slate-600">
          <p>Thời gian thuê mặc định là 4 ngày. Bạn sẽ nhận được đơn hàng trước ngày sự kiện 2 ngày và cần gửi trả vào ngày sau sự kiện.</p>
          <p>Không cần giặt, dịch vụ giặt hấp chuyên nghiệp đã bao gồm trong giá thuê.</p>
        </div>
      )}

      {tab === "size" && (
        <div ref={sizeSectionRef} id="size-guide" className="mt-6 space-y-5 text-base leading-8 text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white">
              <button
                type="button"
                className={`h-10 px-4 rounded-lg text-base font-semibold ${selectedGender === 'female' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onGenderChange?.('female')}
              >
                Nữ
              </button>
              <button
                type="button"
                className={`h-10 px-4 rounded-lg text-base font-semibold ${selectedGender === 'male' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onGenderChange?.('male')}
              >
                Nam
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Bảng đang dùng: <span className="font-semibold text-slate-700">{formatRecommendationSource(sizeGuideSource)}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 space-y-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Gợi ý size theo chiều cao và cân nặng</h4>
              <p className="text-sm text-slate-500">Nhập chiều cao và cân nặng, hệ thống tự chấm điểm theo bảng size để đề xuất size chuẩn nhất.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="space-y-1">
                <span className="block text-sm font-medium text-slate-700">Chiều cao (cm)</span>
                <input
                  type="number"
                  min="0"
                  value={String(sizeRecommendationInput?.heightCm ?? '')}
                  onChange={(event) => onSizeRecommendationInputChange?.('heightCm', event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  placeholder="Ví dụ: 165"
                />
              </label>

              <label className="space-y-1">
                <span className="block text-sm font-medium text-slate-700">Cân nặng (kg)</span>
                <input
                  type="number"
                  min="0"
                  value={String(sizeRecommendationInput?.weightKg ?? '')}
                  onChange={(event) => onSizeRecommendationInputChange?.('weightKg', event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  placeholder="Ví dụ: 52"
                />
              </label>

              <button
                type="button"
                onClick={() => onRecommendSize?.()}
                disabled={sizeRecommendationLoading}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sizeRecommendationLoading ? 'Đang tính...' : 'Tính size'}
              </button>
            </div>

            {sizeRecommendationError ? (
              <p className="text-sm text-rose-600">{sizeRecommendationError}</p>
            ) : null}

            {sizeRecommendationResult ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  Gợi ý size: {sizeRecommendationResult?.recommendedSize || '--'}
                </p>
              </div>
            ) : null}
          </div>

          {sortedSizeRows.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[920px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">Size</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">Chiều cao (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">Cân nặng (kg)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">Dài áo (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600">Rộng (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSizeRows.map((row) => (
                    <tr key={`${row.gender}-${row.sizeLabel}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-base font-semibold text-slate-800">{row.sizeLabel}</td>
                      <td className="px-4 py-3 text-base text-slate-700">{formatRange(row.heightMin, row.heightMax)}</td>
                      <td className="px-4 py-3 text-base text-slate-700">{formatRange(row.weightMin, row.weightMax)}</td>
                      <td className="px-4 py-3 text-base text-slate-700">{formatOptional(row.itemLength)}</td>
                      <td className="px-4 py-3 text-base text-slate-700">{formatOptional(row.itemWidth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base">Chưa có dữ liệu bảng size cho giới tính đã chọn.</p>
          )}
        </div>
      )}
    </section>
  );
}
