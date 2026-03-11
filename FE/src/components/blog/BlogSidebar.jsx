import { ArrowRight, Clock3 } from "lucide-react";

export default function BlogSidebar({ latestPosts, popularCategories }) {
  return (
    <aside className="space-y-5">
      <div className="rounded-[28px] border border-[#e7dbc9] bg-white p-6 shadow-[0_18px_40px_rgba(66,46,18,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Mới nhất</p>
        <div className="mt-5 space-y-4">
          {latestPosts.map((post) => (
            <div key={post.id} className="border-b border-[#f0e6d8] pb-4 last:border-b-0 last:pb-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a07b4f]">
                {post.category}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#33281f]">{post.title}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#7b6654]">
                <Clock3 size={12} />
                {post.readTime}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e7dbc9] bg-[#fffaf3] p-6 shadow-[0_18px_40px_rgba(66,46,18,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Chủ đề phổ biến</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {popularCategories.map((item) => (
            <span
              key={item.name}
              className="inline-flex rounded-full border border-[#ddc6a4] bg-white px-3 py-2 text-xs font-semibold text-[#765f48]"
            >
              {item.name} · {item.count}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-[#dac4a2] bg-[linear-gradient(135deg,#fff7eb_0%,#f4eadb_100%)] p-6 shadow-[0_20px_42px_rgba(66,46,18,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7849]">Mẹo nhanh</p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5c4c3c]">
          <li>Ưu tiên chụp sáng sớm hoặc chiều muộn để màu vải lên mềm và sang hơn.</li>
          <li>Chọn outfit theo concept trước khi đến cửa hàng để thử đồ nhanh và chính xác hơn.</li>
          <li>Đặt lịch trước giúp đội ngũ chuẩn bị size, phụ kiện và màu phù hợp hơn.</li>
        </ul>
        <a
          href="/booking"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#b08d57] bg-[#b08d57] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
        >
          Khám phá ngay
          <ArrowRight size={16} />
        </a>
      </div>
    </aside>
  );
}
