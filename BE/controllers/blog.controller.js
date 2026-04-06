const mongoose = require('mongoose');
const Blog = require('../model/Blog.model');
const { hasCloudinaryConfig, uploadImageBuffer } = require('../utils/cloudinary');

const BLOG_STATUSES = ['draft', 'pending', 'published', 'rejected'];

const normalizeText = (value) => String(value || '').trim();
const normalizeRole = (value) => String(value || '').trim().toLowerCase();
const normalizeStatus = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (BLOG_STATUSES.includes(raw)) return raw;
  if (raw === 'published') return 'published';
  if (raw === 'draft') return 'draft';
  if (raw === 'pending') return 'pending';
  if (raw === 'rejected') return 'rejected';
  return '';
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((item) => normalizeText(item))
          .filter(Boolean)
      )
    );
  }

  return [];
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isOwner = (req) => normalizeRole(req.user?.role) === 'owner';
const isStaff = (req) => normalizeRole(req.user?.role) === 'staff';

const mapBlog = (item) => ({
  _id: item?._id,
  title: item?.title || '',
  slug: item?.slug || '',
  content: item?.content || '',
  thumbnail: item?.thumbnail || '',
  category: item?.category || '',
  tags: Array.isArray(item?.tags) ? item.tags : [],
  status: normalizeStatus(item?.status || 'draft') || 'draft',
  author: item?.author
    ? {
      _id: item.author?._id || item.author,
      name: item.author?.name || '',
      email: item.author?.email || '',
    }
    : null,
  approvedBy: item?.approvedBy
    ? {
      _id: item.approvedBy?._id || item.approvedBy,
      name: item.approvedBy?.name || '',
      email: item.approvedBy?.email || '',
    }
    : null,
  publishedAt: item?.publishedAt || null,
  metaTitle: item?.metaTitle || '',
  metaDescription: item?.metaDescription || '',
  viewCount: Number(item?.viewCount || 0),
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const normalizeBlogInput = (body = {}) => {
  const title = normalizeText(body.title);
  const content = String(body.content || '').trim();

  return {
    title,
    content,
    thumbnail: normalizeText(body.thumbnail),
    category: normalizeText(body.category),
    tags: normalizeTags(body.tags),
    metaTitle: normalizeText(body.metaTitle),
    metaDescription: normalizeText(body.metaDescription),
  };
};

const validateRequiredFields = ({ title, content }) => {
  if (!title) return 'Tiêu đề là bắt buộc';
  if (!content) return 'Nội dung bài viết là bắt buộc';
  return '';
};

const ensureAuthorOrOwner = (req, blog) => {
  if (!blog?.author) return false;
  if (isOwner(req)) return true;
  return String(blog.author) === String(req.user?.id);
};

const createBlog = async (req, res) => {
  try {
    const payload = normalizeBlogInput(req.body);
    const validationError = validateRequiredFields(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const created = await Blog.create({
      ...payload,
      author: req.user.id,
      status: 'draft',
      approvedBy: null,
      publishedAt: null,
    });

    const blog = await Blog.findById(created._id).populate('author', 'name email').lean();
    return res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      data: mapBlog(blog),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo bài viết',
      error: error.message,
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (!ensureAuthorOrOwner(req, blog)) {
      return res.status(403).json({ success: false, message: 'Bạn chỉ được sửa bài viết của mình' });
    }

    const payload = normalizeBlogInput(req.body);
    const validationError = validateRequiredFields(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    blog.title = payload.title;
    blog.content = payload.content;
    blog.thumbnail = payload.thumbnail;
    blog.category = payload.category;
    blog.tags = payload.tags;
    blog.metaTitle = payload.metaTitle;
    blog.metaDescription = payload.metaDescription;

    if (!isOwner(req)) {
      blog.status = 'draft';
      blog.approvedBy = null;
      blog.publishedAt = null;
    }

    await blog.save();
    const updated = await Blog.findById(blog._id)
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: mapBlog(updated),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật bài viết',
      error: error.message,
    });
  }
};

const getMyBlogs = async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);
    const query = { author: req.user.id };
    if (status) query.status = status;

    const blogs = await Blog.find(query)
      .sort({ updatedAt: -1 })
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      data: blogs.map(mapBlog),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách bài viết của bạn',
      error: error.message,
    });
  }
};

const submitBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (!ensureAuthorOrOwner(req, blog)) {
      return res.status(403).json({ success: false, message: 'Bạn chỉ được gửi duyệt bài viết của mình' });
    }

    if (blog.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Bài viết đã xuất bản, vui lòng cập nhật trước khi gửi duyệt lại',
      });
    }

    blog.status = 'pending';
    blog.approvedBy = null;
    blog.publishedAt = null;
    await blog.save();

    return res.status(200).json({
      success: true,
      message: 'Đã gửi duyệt bài viết',
      data: mapBlog(blog.toObject()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi duyệt bài viết',
      error: error.message,
    });
  }
};

const getPendingBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'pending' })
      .sort({ updatedAt: -1 })
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      data: blogs.map(mapBlog),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách bài viết chờ duyệt',
      error: error.message,
    });
  }
};

const approveBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (blog.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể duyệt bài viết đang ở trạng thái chờ duyệt',
      });
    }

    blog.approvedBy = req.user.id;
    await blog.save();

    const approved = await Blog.findById(blog._id)
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Duyệt bài viết thành công',
      data: mapBlog(approved),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể duyệt bài viết',
      error: error.message,
    });
  }
};

const rejectBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    blog.status = 'rejected';
    blog.approvedBy = null;
    blog.publishedAt = null;
    await blog.save();

    const rejected = await Blog.findById(blog._id)
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối bài viết',
      data: mapBlog(rejected),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể từ chối bài viết',
      error: error.message,
    });
  }
};

const publishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (!blog.approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'Bài viết chưa được duyệt, không thể xuất bản',
      });
    }

    if (blog.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xuất bản bài viết đang ở trạng thái chờ duyệt',
      });
    }

    blog.status = 'published';
    blog.publishedAt = new Date();
    await blog.save();

    const published = await Blog.findById(blog._id)
      .populate('author', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Xuất bản bài viết thành công',
      data: mapBlog(published),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể xuất bản bài viết',
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (isOwner(req)) {
      await blog.deleteOne();
      return res.status(200).json({
        success: true,
        message: 'Xóa bài viết thành công',
      });
    }

    if (!ensureAuthorOrOwner(req, blog)) {
      return res.status(403).json({ success: false, message: 'Bạn chỉ được xóa bài viết của mình' });
    }

    if (blog.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Nhân viên chỉ được xóa bài viết ở trạng thái nháp',
      });
    }

    await blog.deleteOne();
    return res.status(200).json({
      success: true,
      message: 'Xóa bài viết thành công',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa bài viết',
      error: error.message,
    });
  }
};

const getPublishedBlogs = async (req, res) => {
  try {
    const category = normalizeText(req.query.category);
    const tag = normalizeText(req.query.tag);
    const keyword = normalizeText(req.query.q);
    const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
    const page = Math.max(Number(req.query.page || 1), 1);
    const skip = (page - 1) * limit;

    const query = { status: { $in: ['published', 'Published'] } };
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (keyword) {
      const pattern = new RegExp(escapeRegex(keyword), 'i');
      query.$or = [{ title: pattern }, { content: pattern }, { category: pattern }, { tags: pattern }];
    }

    const [items, total] = await Promise.all([
      Blog.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name')
        .populate('approvedBy', 'name')
        .lean(),
      Blog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: items.map(mapBlog),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách bài viết',
      error: error.message,
    });
  }
};

const getPublishedBlogBySlug = async (req, res) => {
  try {
    const slug = normalizeText(req.params.slug);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug bài viết là bắt buộc' });
    }

    const detailQuery = {
      status: { $in: ['published', 'Published'] },
      $or: [{ slug }],
    };
    if (mongoose.Types.ObjectId.isValid(slug)) {
      detailQuery.$or.push({ _id: slug });
    }

    const blog = await Blog.findOneAndUpdate(
      detailQuery,
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('author', 'name')
      .populate('approvedBy', 'name')
      .lean();

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    return res.status(200).json({
      success: true,
      data: mapBlog(blog),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể tải chi tiết bài viết',
      error: error.message,
    });
  }
};

const uploadBlogThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh thumbnail',
      });
    }

    if (!hasCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary chưa cấu hình, không thể tải ảnh',
      });
    }

    const uploaded = await uploadImageBuffer(req.file.buffer, {
      folder: 'inhere/blogs',
      resource_type: 'image',
    });

    return res.status(200).json({
      success: true,
      message: 'Tải ảnh thành công',
      data: {
        url: uploaded?.secure_url || '',
      },
    });
  } catch (error) {
    const uploadErrorMessage = error?.error?.message || error?.message || 'Upload thất bại';
    return res.status(500).json({
      success: false,
      message: uploadErrorMessage,
      error: uploadErrorMessage,
    });
  }
};

module.exports = {
  approveBlog,
  createBlog,
  deleteBlog,
  getMyBlogs,
  getPendingBlogs,
  getPublishedBlogBySlug,
  getPublishedBlogs,
  publishBlog,
  rejectBlog,
  submitBlog,
  updateBlog,
  uploadBlogThumbnail,
};
