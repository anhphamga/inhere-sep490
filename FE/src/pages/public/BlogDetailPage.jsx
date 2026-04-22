import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Share2, Sparkles } from "lucide-react";
import Header from "../../components/common/Header";
import BlogGrid from "../../components/blog/BlogGrid";
import { normalizeBlogPosts } from "../../utils/blogData";
import { sanitizeBlogHtml } from "../../utils/sanitizeBlogHtml";
import { getBlogBySlugApi, getPublishedBlogsApi } from "../../services/blog.service";

export default function BlogDetailPage() {
  const navigate = useNavigate();
  const { id: slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBlogDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const detailResponse = await getBlogBySlugApi(slug);
        const detail = detailResponse?.data ? normalizeBlogPosts([detailResponse.data])[0] : null;

        const listResponse = await getPublishedBlogsApi({ page: 1, limit: 30 });
        const list = normalizeBlogPosts(Array.isArray(listResponse?.data) ? listResponse.data : []);

        if (!mounted) return;
        setPost(detail || null);
        setRelatedPosts(list.filter((item) => item.id !== (detail?.id || slug)).slice(0, 3));
        if (!detail) {
          setError("Không tìm thấy bài viết bạn đang xem.");
        }
      } catch (fetchError) {
        if (!mounted) return;
        setPost(null);
        setRelatedPosts([]);
        setError(fetchError?.response?.data?.message || "Không thể tải bài viết.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBlogDetail();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const bodyHtml = useMemo(() => sanitizeBlogHtml(post?.content), [post?.content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2e9_52%,#fcf8f2_100%)] text-[#2f251c]">
        <Header active="blog" />
        <main className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[#eadfce] bg-white p-8 text-sm font-medium text-[#6d5b49]">
            Đang tải chi tiết bài viết...
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2e9_52%,#fcf8f2_100%)] text-[#2f251c]">
        <Header active="blog" />
        <main className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[#eadfce] bg-white p-10 text-center">
            <p className="text-lg font-semibold text-[#31271e]">Không tìm thấy bài viết.</p>
            {error && <p className="mt-3 text-sm text-[#7b6654]">{error}</p>}
            <Link
              to="/blog"
              className="mt-6 inline-flex rounded-full border border-[#d9c09a] bg-[#fff7eb] px-5 py-3 text-sm font-semibold text-[#8f6d3f]"
            >
              Quay lại trang blog
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2e9_52%,#fcf8f2_100%)] text-[#2f251c]">
      <Header active="blog" />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate("/blog")}
              className="inline-flex items-center gap-2 rounded-full border border-[#dcc6a5] bg-white px-5 py-3 text-sm font-semibold text-[#7c6244] transition hover:bg-[#faf2e6]"
            >
              <ArrowLeft size={16} />
              Quay lại blog
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href,
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7dbc9] bg-white px-5 py-3 text-sm font-semibold text-[#7b6654] transition hover:bg-[#faf6f0]"
            >
              <Share2 size={16} />
              Chia sẻ bài viết
            </button>
          </div>

          <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-[0_22px_54px_rgba(66,46,18,0.08)]">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[320px] bg-[#f2e9dc] lg:min-h-[560px]">
                <img src={post.thumbnail} alt={post.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(46,31,15,0.16)] via-transparent to-transparent" />
              </div>

              <div className="flex flex-col justify-between p-8 md:p-10 lg:p-12">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#a07b4f]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf4e8] px-3 py-1">
                      <Sparkles size={12} />
                      {post.category}
                    </span>
                    <span>{post.dateLabel}</span>
                    <span className="inline-flex items-center gap-1 text-[#7c6652]">
                      <Clock3 size={12} />
                      {post.readTime}
                    </span>
                  </div>

                  <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#2f251c] md:text-5xl">
                    {post.title}
                  </h1>

                  <p className="max-w-2xl text-base leading-8 text-[#5e4f40] md:text-lg">{post.excerpt}</p>
                </div>

                <div className="mt-8 grid gap-4 rounded-[24px] border border-[#eee1d0] bg-[#fdf8f1] p-5 text-sm leading-7 text-[#645644]">
                  <p>
                    Bài viết này được biên soạn nhằm giúp khách hàng INHERE lựa chọn trang phục, lên concept và trải
                    nghiệm Hội An theo cách thanh lịch, nhẹ nhàng và chủ động hơn.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-[0_20px_48px_rgba(66,46,18,0.06)] md:p-10">
              <div
                className="blog-content mx-auto max-w-3xl text-[16px] leading-8 text-[#4e4338] [&_a]:text-[#a07b4f] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#dcc6a5] [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#2f251c] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
                dangerouslySetInnerHTML={{
                  __html:
                    bodyHtml.trim() ||
                    '<p class="text-[#7b6654]">Nội dung bài viết đang được cập nhật.</p>',
                }}
              />
            </article>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-[#e7dbc9] bg-white p-6 shadow-[0_18px_40px_rgba(66,46,18,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Gợi ý nhanh</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5e4f40]">
                  <li>Ưu tiên đặt lịch trước nếu đi nhóm hoặc muốn thử nhiều concept.</li>
                  <li>Chuẩn bị trước bảng màu mong muốn để chọn đồ nhanh hơn.</li>
                  <li>Hỏi nhân viên về phụ kiện đi kèm để tổng thể ảnh hoàn chỉnh hơn.</li>
                </ul>
              </div>

              <div className="rounded-[28px] border border-[#dac4a2] bg-[linear-gradient(135deg,#fff7eb_0%,#f4eadb_100%)] p-6 shadow-[0_20px_42px_rgba(66,46,18,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7849]">Đặt lịch với INHERE</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2f251c]">
                  Muốn thử đồ nhanh hơn?
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5c4c3c]">
                  Đặt lịch trước để đội ngũ chuẩn bị sẵn size, màu sắc và concept phù hợp với lịch trình của bạn.
                </p>
                <Link
                  to="/buy?purpose=rent&openBooking=1"
                  className="mt-6 inline-flex rounded-full border border-[#b08d57] bg-[#b08d57] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Đặt lịch ngay
                </Link>
              </div>
            </aside>
          </section>

          {relatedPosts.length > 0 && (
            <section className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Khám phá thêm</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2f251c]">
                  Bài viết liên quan
                </h2>
              </div>
              <BlogGrid posts={relatedPosts} onRead={(related) => navigate(`/blog/${related.slug || related.id}`)} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
