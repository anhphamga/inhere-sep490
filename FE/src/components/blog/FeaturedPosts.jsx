import BlogCard from "./BlogCard";

export default function FeaturedPosts({ posts, onRead }) {
  if (!posts?.length) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">
            Editor&apos;s Picks
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2f251c]">
            Bài viết nổi bật
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#6b5a49]">
          Chọn lọc các chủ đề dễ đọc, thực tế và gần nhất với nhu cầu thuê đồ, đi chụp ảnh và phối
          trang phục của khách hàng InHere.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} onRead={onRead} />
        ))}
      </div>
    </section>
  );
}
