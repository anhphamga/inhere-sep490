const Blog = require('../model/Blog.model');
const {
  getRequestLang,
  resolveLocalizedField,
  normalizeLocalizedInput,
  hasLocalizedText,
} = require('../utils/i18n');

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeStatus = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'published' || raw === 'public' || raw === 'publish') return 'Published';
  if (raw === 'hidden') return 'Hidden';
  return 'Draft';
};

const normalizePayload = (body = {}) => ({
  title: normalizeLocalizedInput(body, 'title'),
  slug: String(body.slug || '').trim(),
  thumbnail: String(body.thumbnail || '').trim(),
  category: normalizeLocalizedInput(body, 'category'),
  content: normalizeLocalizedInput(body, 'content'),
  status: normalizeStatus(body.status),
  likeCount: Math.max(toNumber(body.likeCount, 0), 0),
  viewCount: Math.max(toNumber(body.viewCount, 0), 0),
});

const mapBlog = (item, lang = 'vi') => ({
  _id: item._id,
  title: resolveLocalizedField(item, 'title', lang),
  slug: item.slug || '',
  content: resolveLocalizedField(item, 'content', lang),
  thumbnail: item.thumbnail || '',
  category: resolveLocalizedField(item, 'category', lang),
  likeCount: Number(item.likeCount || 0),
  viewCount: Number(item.viewCount || 0),
  status: normalizeStatus(item.status || 'Published'),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getAllBlogs = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const scope = String(req.query.scope || '').trim().toLowerCase();
    const filter =
      scope === 'all'
        ? {}
        : {
          $or: [
            { status: 'Published' },
            { status: { $exists: false } },
          ],
        };

    const blogs = await Blog.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      message: 'Get all blogs successfully',
      data: blogs.map((item) => mapBlog(item, lang)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting blogs',
      error: error.message,
    });
  }
};

const getBlogById = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: mapBlog(blog, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting blog',
      error: error.message,
    });
  }
};

const createBlog = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const payload = normalizePayload(req.body);
    if (!hasLocalizedText(payload.title) || !hasLocalizedText(payload.content)) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required',
      });
    }

    const created = await Blog.create(payload);
    return res.status(201).json({
      success: true,
      data: mapBlog(created, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error.message,
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const payload = normalizePayload(req.body);
    if (!hasLocalizedText(payload.title) || !hasLocalizedText(payload.content)) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required',
      });
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: mapBlog(updated, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message,
    });
  }
};

module.exports = {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
