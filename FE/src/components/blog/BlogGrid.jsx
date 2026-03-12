import BlogCard from "./BlogCard";

export default function BlogGrid({ posts, onRead }) {
  if (!posts?.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#d9c8b4] bg-white/70 p-10 text-center text-[#715f4d]">
        Chưa có bài viết phù hợp với bộ lọc này. Hãy chọn chủ đề khác để tiếp tục khám phá.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} onRead={onRead} />
      ))}
    </div>
  );
}
