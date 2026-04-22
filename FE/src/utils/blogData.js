const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80";

const DEFAULT_CATEGORY = "Chưa phân loại";
const ALL_CATEGORY = "Tất cả";

const slugify = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getAllBlogCategoryLabel = () => ALL_CATEGORY;

export const inferBlogCategory = (value = "") => {
  const raw = String(value || "").trim();
  return raw || DEFAULT_CATEGORY;
};

export const formatBlogDateLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Cập nhật gần đây";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

/** Lấy text thuần từ HTML editor (Quill) để excerpt / đếm từ không dính thẻ */
const stripBlogHtmlToPlainText = (html = "") =>
  String(html || "")
    .replace(/<p><br\s*\/?><\/p>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildBlogExcerpt = (content = "") => {
  const text = stripBlogHtmlToPlainText(content);
  if (!text) return "Bài viết đang được cập nhật nội dung.";
  return text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
};

export const buildBlogReadTime = (content = "") => {
  const text = stripBlogHtmlToPlainText(content);
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(3, Math.ceil(words / 180));
  return `${minutes} phút đọc`;
};

export const normalizeBlogPosts = (posts = []) =>
  posts.map((post, index) => {
    const content = String(post?.content || "").trim();
    const title = String(post?.title || `Bài viết ${index + 1}`).trim();
    const category = inferBlogCategory(post?.category);
    const id = String(post?._id || post?.id || slugify(title) || `blog-${index + 1}`);

    return {
      ...post,
      id,
      _id: post?._id || id,
      title,
      category,
      thumbnail: String(post?.thumbnail || "").trim() || DEFAULT_THUMBNAIL,
      content,
      excerpt: buildBlogExcerpt(content),
      dateLabel: formatBlogDateLabel(post?.createdAt || post?.updatedAt),
      readTime: buildBlogReadTime(content),
    };
  });

export const buildBlogCategories = (posts = []) => {
  const categories = Array.from(
    new Set(
      posts
        .map((post) => inferBlogCategory(post?.category))
        .filter(Boolean)
    )
  );

  return [ALL_CATEGORY, ...categories];
};
