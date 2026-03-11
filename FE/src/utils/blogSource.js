import rawBlogPosts from "../../../data/blogs.json";

const getObjectId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.$oid) return String(value.$oid);
  return "";
};

const getDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.$date) return String(value.$date);
  return "";
};

const normalizeRawBlogPost = (post = {}) => ({
  ...post,
  _id: getObjectId(post._id) || getObjectId(post.id),
  createdAt: getDateValue(post.createdAt),
  updatedAt: getDateValue(post.updatedAt),
  status: String(post.status || "Published"),
});

export const getBlogPostsFromData = ({ includeDrafts = false } = {}) => {
  const normalized = Array.isArray(rawBlogPosts) ? rawBlogPosts.map(normalizeRawBlogPost) : [];

  return normalized
    .filter((post) => includeDrafts || String(post.status || "").trim().toLowerCase() === "published")
    .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
};

export const getBlogPostByIdFromData = (id) => {
  if (!id) return null;
  const normalizedId = String(id);
  return (
    getBlogPostsFromData({ includeDrafts: true }).find(
      (post) => post._id === normalizedId || post.slug === normalizedId
    ) || null
  );
};
