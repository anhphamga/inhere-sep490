import BlogCard from "./BlogCard";

export default function BlogHero({ featuredPost, quickReadPost, onRead }) {
  if (!featuredPost) return null;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
      <div className="space-y-5 rounded-[32px] border border-[#ebdfcf] bg-[linear-gradient(135deg,#fffdf9_0%,#f8f1e8_100%)] p-8 shadow-[0_24px_60px_rgba(71,51,24,0.08)] md:p-10">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-[#dbc2a1] bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7850]">
            InHere Journal
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#2a2118] md:text-5xl">
            Cẩm nang thuê đồ, phối trang phục và trải nghiệm Hội An theo cách tinh tế hơn
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#5a4d3f] md:text-lg">
            Những bài viết chọn lọc giúp khách hàng khám phá outfit đẹp hơn, ảnh lên sang hơn và
            trải nghiệm thuê đồ trở nên nhẹ nhàng, chủ động.
          </p>
        </div>

        <BlogCard post={featuredPost} onRead={onRead} variant="featured" />
      </div>

      <aside className="flex h-full flex-col gap-5">
        <div className="rounded-[28px] border border-[#ebdfcf] bg-white p-6 shadow-[0_20px_45px_rgba(66,46,18,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a27e52]">Quick read</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2f251c]">
            Bài viết mới nhất
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#645646]">
            Gợi ý nhanh cho khách đang tìm trang phục, concept chụp ảnh hoặc lịch trình khám phá
            Hội An.
          </p>
        </div>
        <BlogCard post={quickReadPost || featuredPost} onRead={onRead} />
      </aside>
    </section>
  );
}
