import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import BlogCategories from "../../components/blog/BlogCategories";
import BlogGrid from "../../components/blog/BlogGrid";
import BlogHero from "../../components/blog/BlogHero";
import BlogSidebar from "../../components/blog/BlogSidebar";
import FeaturedPosts from "../../components/blog/FeaturedPosts";
import {
  buildBlogCategories,
  getAllBlogCategoryLabel,
  normalizeBlogPosts,
} from "../../utils/blogData";
import { getPublishedBlogsApi } from "../../services/blog.service";

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(getAllBlogCategoryLabel());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getPublishedBlogsApi({ page: 1, limit: 60 });
        const list = Array.isArray(response?.data) ? response.data : [];
        if (!mounted) return;
        setPosts(normalizeBlogPosts(list));
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError?.response?.data?.message || "Không thể tải bài viết từ máy chủ.");
        setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBlogs();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => buildBlogCategories(posts), [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === getAllBlogCategoryLabel()) return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const selectedPost = useMemo(() => filteredPosts[0] || posts[0] || null, [filteredPosts, posts]);

  const quickReadPost = useMemo(
    () =>
      filteredPosts.find((post) => post.id !== selectedPost?.id) ||
      posts.find((post) => post.id !== selectedPost?.id) ||
      null,
    [filteredPosts, posts, selectedPost]
  );

  const editorPicks = useMemo(() => {
    const source = filteredPosts.length > 0 ? filteredPosts : posts;
    return source.filter((post) => post.id !== selectedPost?.id).slice(0, 3);
  }, [filteredPosts, posts, selectedPost]);

  const latestPosts = useMemo(() => posts.slice(0, 4), [posts]);

  const popularCategories = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [posts]);

  const handleReadPost = (post) => {
    if (!post) return;
    navigate(`/blog/${post.slug || post.id}`);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2e9_52%,#fcf8f2_100%)] text-[#2f251c]">
      <Header active="blog" />

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="space-y-12 lg:space-y-16">
          {selectedPost && (
            <>
              <BlogHero featuredPost={selectedPost} quickReadPost={quickReadPost} onRead={handleReadPost} />
              <FeaturedPosts posts={editorPicks} onRead={handleReadPost} />
            </>
          )}

          <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="space-y-6">
              <BlogCategories
                categories={categories}
                selected={selectedCategory}
                onChange={setSelectedCategory}
              />

              {loading && (
                <div className="rounded-[28px] border border-[#e9ddcc] bg-white p-8 text-sm font-medium text-[#6d5b49]">
                  Dang tai noi dung blog...
                </div>
              )}

              {error && (
                <div className="rounded-[20px] border border-[#ead2ad] bg-[#fff6e8] px-5 py-4 text-sm text-[#8a6a3f]">
                  {error}
                </div>
              )}

              {!loading && !error && !posts.length && (
                <div className="rounded-[28px] border border-[#e9ddcc] bg-white p-8 text-sm font-medium text-[#6d5b49]">
                  Hien chua co bai viet nao tu du lieu.
                </div>
              )}

              {!loading && <BlogGrid posts={filteredPosts} onRead={handleReadPost} />}
            </div>

            <BlogSidebar latestPosts={latestPosts} popularCategories={popularCategories} />
          </section>
        </div>
      </main>
    </div>
  );
}
