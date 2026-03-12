import { ArrowRight, Clock3, Sparkles } from "lucide-react";

const CARD_STYLES = {
  featured: "md:grid-cols-[1.05fr_1fr] md:items-stretch",
};

export default function BlogCard({ post, onRead, variant = "default" }) {
  if (!post) return null;

  const isFeatured = variant === "featured";

  return (
    <article
      className={`group overflow-hidden rounded-[28px] border border-[#e8dece] bg-white shadow-[0_20px_45px_rgba(66,46,18,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(66,46,18,0.12)] ${
        isFeatured ? `grid ${CARD_STYLES.featured}` : "flex h-full flex-col"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-[#f3ece2] ${isFeatured ? "min-h-[320px]" : "aspect-[16/10]"}`}
      >
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8f3ea_0%,#eee2cf_100%)] text-sm font-semibold uppercase tracking-[0.18em] text-[#8c7660]">
            InHere Journal
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(48,31,13,0.18)] via-transparent to-transparent" />
      </div>

      <div className={`flex flex-1 flex-col ${isFeatured ? "justify-between p-8 md:p-10" : "p-6"}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9d7a4f]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf4e8] px-3 py-1 text-[11px]">
              <Sparkles size={12} />
              {post.category}
            </span>
            <span>{post.dateLabel}</span>
            <span className="inline-flex items-center gap-1 text-[#7b6550]">
              <Clock3 size={12} />
              {post.readTime}
            </span>
          </div>

          <div className="space-y-3">
            <h3
              className={`${isFeatured ? "text-3xl md:text-[2.35rem]" : "text-xl"} font-semibold leading-tight tracking-[-0.03em] text-[#2f251c]`}
            >
              {post.title}
            </h3>
            <p className="text-[15px] leading-7 text-[#5d4f41]">{post.excerpt}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRead?.(post)}
          className="mt-8 inline-flex items-center gap-2 self-start rounded-full border border-[#d6bf9c] bg-[#fffaf3] px-5 py-3 text-sm font-semibold text-[#8f6d3f] transition-colors duration-200 hover:bg-[#f5ead8]"
        >
          Đọc bài viết
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
