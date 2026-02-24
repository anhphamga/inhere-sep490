const Blog = require('../model/Blog.model');

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeStatus = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'public') return 'published';
  if (raw === 'draft' || raw === 'published') return raw;
  return 'draft';
};

const normalizePayload = (body = {}) => ({
  title: String(body.title || '').trim(),
  slug: String(body.slug || '').trim(),
  thumbnail: String(body.thumbnail || '').trim(),
  category: String(body.category || '').trim(),
  content: String(body.content || '').trim(),
  status: normalizeStatus(body.status),
  likeCount: Math.max(toNumber(body.likeCount, 0), 0),
  viewCount: Math.max(toNumber(body.viewCount, 0), 0),
});

const mapBlog = (item) => ({
  _id: item._id,
  title: item.title || '',
  slug: item.slug || '',
  content: item.content || '',
  thumbnail: item.thumbnail || '',
  category: item.category || '',
  likeCount: Number(item.likeCount || 0),
  viewCount: Number(item.viewCount || 0),
  status: normalizeStatus(item.status || 'published'),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getAllBlogs = async (req, res) => {
  try {
    const scope = String(req.query.scope || '').trim().toLowerCase();
    const filter =
      scope === 'all'
        ? {}
        : {
            $or: [
              { status: { $in: ['published', 'Public'] } },
              { status: { $exists: false } },
            ],
          };

    const blogs = await Blog.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      message: 'Get all blogs successfully',
      data: blogs.map(mapBlog),
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
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: mapBlog(blog),
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
    const payload = normalizePayload(req.body);
    if (!payload.title || !payload.content) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required',
      });
    }

    const created = await Blog.create(payload);
    return res.status(201).json({
      success: true,
      data: mapBlog(created),
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
    const payload = normalizePayload(req.body);
    if (!payload.title || !payload.content) {
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
      data: mapBlog(updated),
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
