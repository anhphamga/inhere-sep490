import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Share2, Sparkles } from "lucide-react";
import Header from "../../components/common/Header";
import BlogGrid from "../../components/blog/BlogGrid";
import { normalizeBlogPosts } from "../../utils/blogData";
import { getBlogPostByIdFromData, getBlogPostsFromData } from "../../utils/blogSource";

const splitContentToParagraphs = (content = "") =>
  String(content || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export default function BlogDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
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
    setLoading(true);
    setError("");

    const normalizedList = normalizeBlogPosts(getBlogPostsFromData());
    const rawDetail = getBlogPostByIdFromData(id);
    const normalizedDetail = rawDetail ? normalizeBlogPosts([rawDetail])[0] : null;

    setPost(normalizedDetail || null);
    setRelatedPosts(normalizedList.filter((item) => item.id !== (normalizedDetail?.id || id)).slice(0, 3));

    if (!normalizedDetail) {
      setError("Khong tim thay bai viet ban dang xem.");
    }

    setLoading(false);
  }, [id]);

  const paragraphs = useMemo(() => splitContentToParagraphs(post?.content), [post?.content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2e9_52%,#fcf8f2_100%)] text-[#2f251c]">
        <Header active="blog" />
        <main className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[#eadfce] bg-white p-8 text-sm font-medium text-[#6d5b49]">
            Dang tai chi tiet bai viet...
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
            <p className="text-lg font-semibold text-[#31271e]">Khong tim thay bai viet.</p>
            {error && <p className="mt-3 text-sm text-[#7b6654]">{error}</p>}
            <Link
              to="/blog"
              className="mt-6 inline-flex rounded-full border border-[#d9c09a] bg-[#fff7eb] px-5 py-3 text-sm font-semibold text-[#8f6d3f]"
            >
              Quay lai trang blog
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
              Quay lai blog
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
              Chia se bai viet
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
                    Bai viet nay duoc bien soan nham giup khach hang InHere lua chon trang phuc, len concept va trai
                    nghiem Hoi An theo cach thanh lich, nhe nhang va chu dong hon.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-[0_20px_48px_rgba(66,46,18,0.06)] md:p-10">
              <div className="mx-auto max-w-3xl space-y-6 text-[16px] leading-8 text-[#4e4338]">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${post.id}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
            </article>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-[#e7dbc9] bg-white p-6 shadow-[0_18px_40px_rgba(66,46,18,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Goi y nhanh</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5e4f40]">
                  <li>Uu tien dat lich truoc neu di nhom hoac muon thu nhieu concept.</li>
                  <li>Chuan bi truoc bang mau mong muon de chon do nhanh hon.</li>
                  <li>Hoi nhan vien ve phu kien di kem de tong the anh hoan chinh hon.</li>
                </ul>
              </div>

              <div className="rounded-[28px] border border-[#dac4a2] bg-[linear-gradient(135deg,#fff7eb_0%,#f4eadb_100%)] p-6 shadow-[0_20px_42px_rgba(66,46,18,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7849]">Dat lich voi InHere</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2f251c]">
                  Muon thu do nhanh hon?
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5c4c3c]">
                  Dat lich truoc de doi ngu chuan bi san size, mau sac va concept phu hop voi lich trinh cua ban.
                </p>
                <Link
                  to="/buy?purpose=rent&openBooking=1"
                  className="mt-6 inline-flex rounded-full border border-[#b08d57] bg-[#b08d57] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Dat lich ngay
                </Link>
              </div>
            </aside>
          </section>

          {relatedPosts.length > 0 && (
            <section className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a07b4f]">Kham pha them</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#2f251c]">
                  Bai viet lien quan
                </h2>
              </div>
              <BlogGrid posts={relatedPosts} onRead={(related) => navigate(`/blog/${related.id}`)} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
