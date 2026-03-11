export default function BlogCategories({ categories, selected, onChange }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">
            Khám phá theo chủ đề
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2f251c]">
            Tất cả bài viết
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onChange("Tất cả")}
          className="inline-flex w-fit rounded-full border border-[#ddc7a7] bg-[#fffaf3] px-5 py-3 text-sm font-semibold text-[#8f6d3f] transition-colors hover:bg-[#f7ecdd]"
        >
          Xem tất cả bài viết
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((category) => {
          const active = selected === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? "border-[#b08d57] bg-[#b08d57] text-white shadow-[0_10px_24px_rgba(176,141,87,0.18)]"
                  : "border-[#e6d8c4] bg-white text-[#6b5946] hover:border-[#cfb18b] hover:text-[#8a6a3f]"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </section>
  );
}
