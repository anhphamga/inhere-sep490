import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../contexts/AuthContext';
import {
  createBlogApi,
  deleteBlogApi,
  getMyBlogsApi,
  submitBlogApi,
  updateBlogApi,
  uploadBlogThumbnailApi,
} from '../../services/blog.service';

const STATUS_LABELS = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  published: 'Đã xuất bản',
  rejected: 'Bị từ chối',
};

const DEFAULT_FORM = {
  title: '',
  category: '',
  tags: '',
  thumbnail: '',
  metaTitle: '',
  metaDescription: '',
  content: '',
};

const toText = (value) => String(value || '').trim();
const extractApiError = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getStatusClass = (status) => {
  if (status === 'published') return 'bg-emerald-100 text-emerald-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const parseMode = (path = '') => {
  const newMatch = path.match(/^\/staff\/blogs\/new\/?$/);
  if (newMatch) return { mode: 'create', id: '' };

  const editMatch = path.match(/^\/staff\/blogs\/([^/]+)\/edit\/?$/);
  if (editMatch) return { mode: 'edit', id: editMatch[1] };

  return { mode: 'list', id: '' };
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Vừa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
  ],
};

const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link', 'blockquote', 'code-block'];

function BlogEditor({ blogId, onBack, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [existingBlog, setExistingBlog] = useState(null);
  const fileRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  const draftStorageKey = useMemo(
    () => `staff_blog_draft_${toText(user?.id)}_${blogId || 'new'}`,
    [blogId, user?.id]
  );

  useEffect(() => {
    let mounted = true;
    const loadBlog = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');

        if (!blogId) {
          const cachedDraft = localStorage.getItem(draftStorageKey);
          if (mounted && cachedDraft) {
            const parsed = JSON.parse(cachedDraft);
            setForm((prev) => ({ ...prev, ...parsed }));
          }
          return;
        }

        const response = await getMyBlogsApi();
        const list = Array.isArray(response?.data) ? response.data : [];
        const blog = list.find((item) => String(item?._id) === String(blogId));
        if (!blog) {
          setError('Không tìm thấy bài viết hoặc bạn không có quyền truy cập.');
          return;
        }
        if (!mounted) return;

        setExistingBlog(blog);
        setForm({
          title: toText(blog.title),
          category: toText(blog.category),
          tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
          thumbnail: toText(blog.thumbnail),
          metaTitle: toText(blog.metaTitle),
          metaDescription: toText(blog.metaDescription),
          content: toText(blog.content),
        });

        const cachedDraft = localStorage.getItem(draftStorageKey);
        if (cachedDraft) {
          const parsed = JSON.parse(cachedDraft);
          setForm((prev) => ({ ...prev, ...parsed }));
        }
      } catch (fetchError) {
        setError(extractApiError(fetchError, 'Không thể tải dữ liệu bài viết.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBlog();
    return () => {
      mounted = false;
    };
  }, [blogId, draftStorageKey]);

  useEffect(() => {
    if (loading) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(draftStorageKey, JSON.stringify(form));
    }, 500);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draftStorageKey, form, loading]);

  const handleInput = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    title: toText(form.title),
    category: toText(form.category),
    tags: toText(form.tags)
      .split(',')
      .map((item) => toText(item))
      .filter(Boolean),
    thumbnail: toText(form.thumbnail),
    metaTitle: toText(form.metaTitle),
    metaDescription: toText(form.metaDescription),
    content: toText(form.content),
  });

  const saveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = buildPayload();
      let response;
      if (blogId) {
        response = await updateBlogApi(blogId, payload);
      } else {
        response = await createBlogApi(payload);
      }

      const saved = response?.data || null;
      if (!saved) throw new Error('Không nhận được dữ liệu bài viết sau khi lưu');

      localStorage.removeItem(draftStorageKey);
      setSuccess('Đã lưu nháp thành công.');
      onSaved?.(saved);
    } catch (saveError) {
      setError(extractApiError(saveError, 'Không thể lưu nháp.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = buildPayload();
      let activeBlogId = blogId;
      if (blogId) {
        await updateBlogApi(blogId, payload);
      } else {
        const createdResponse = await createBlogApi(payload);
        activeBlogId = createdResponse?.data?._id;
      }

      if (!activeBlogId) {
        throw new Error('Không xác định được bài viết để gửi duyệt');
      }

      await submitBlogApi(activeBlogId);
      localStorage.removeItem(draftStorageKey);
      setSuccess('Đã gửi duyệt bài viết.');
      onSaved?.();
    } catch (submitError) {
      setError(extractApiError(submitError, 'Không thể gửi duyệt.'));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadThumbnail = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      const response = await uploadBlogThumbnailApi(file);
      const url = response?.data?.url || '';
      if (!url) throw new Error('Upload ảnh thất bại');
      setForm((prev) => ({ ...prev, thumbnail: url }));
    } catch (uploadError) {
      setError(extractApiError(uploadError, 'Không thể tải ảnh'));
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  if (loading) {
    return <div className="rounded-xl bg-white p-6 text-sm text-slate-600">Đang tải dữ liệu bài viết...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {blogId ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
          </h2>
          <p className="text-sm text-slate-500">
            Soạn nội dung, lưu nháp tự động và gửi duyệt cho chủ cửa hàng.
          </p>
          {existingBlog ? (
            <p className="mt-1 text-xs text-slate-500">
              Trạng thái hiện tại: <strong>{STATUS_LABELS[existingBlog.status] || existingBlog.status}</strong>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Quay lại danh sách
        </button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Tiêu đề
              <input
                type="text"
                value={form.title}
                onChange={(event) => handleInput('title', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nhập tiêu đề bài viết"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Danh mục
              <input
                type="text"
                value={form.category}
                onChange={(event) => handleInput('category', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ví dụ: Cẩm nang Hội An"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Tags (phân tách bằng dấu phẩy)
              <input
                type="text"
                value={form.tags}
                onChange={(event) => handleInput('tags', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="áo dài, thuê đồ, phố cổ"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Ảnh thumbnail
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={form.thumbnail}
                  onChange={(event) => handleInput('thumbnail', event.target.value)}
                  className="min-w-[280px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Dán URL ảnh hoặc tải ảnh lên"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadThumbnail}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  {uploading ? 'Đang tải...' : 'Tải ảnh'}
                </button>
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              SEO - Meta title
              <input
                type="text"
                value={form.metaTitle}
                onChange={(event) => handleInput('metaTitle', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tiêu đề SEO"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              SEO - Meta description
              <input
                type="text"
                value={form.metaDescription}
                onChange={(event) => handleInput('metaDescription', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mô tả SEO ngắn"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Nội dung bài viết</p>
            <ReactQuill theme="snow" value={form.content} onChange={(value) => handleInput('content', value)} modules={quillModules} formats={quillFormats} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Đang xử lý...' : 'Lưu nháp'}
            </button>
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={saving}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Đang xử lý...' : 'Gửi duyệt'}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Xem trước</h3>
          <div className="mt-4 space-y-3">
            {form.thumbnail ? (
              <img src={form.thumbnail} alt={form.title || 'Thumbnail'} className="h-52 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
                Chưa có ảnh thumbnail
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{form.category || 'Chưa phân loại'}</p>
            <h4 className="text-2xl font-bold text-slate-900">{form.title || 'Tiêu đề bài viết'}</h4>
            <p className="text-xs text-slate-500">{form.metaDescription || 'Meta description sẽ hiển thị tại đây.'}</p>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: form.content || '<p>Chưa có nội dung.</p>' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffBlogsPage({ pathName }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState('');

  const routeMeta = useMemo(() => parseMode(pathName), [pathName]);

  const loadMyPosts = async (status = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      const response = await getMyBlogsApi(status === 'all' ? {} : { status });
      setPosts(Array.isArray(response?.data) ? response.data : []);
    } catch (fetchError) {
      setError(extractApiError(fetchError, 'Không thể tải danh sách bài viết.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeMeta.mode !== 'list') return;
    loadMyPosts();
  }, [routeMeta.mode, statusFilter]);

  const handleSubmit = async (id) => {
    try {
      setProcessingId(id);
      await submitBlogApi(id);
      await loadMyPosts();
    } catch (submitError) {
      setError(extractApiError(submitError, 'Không thể gửi duyệt bài viết.'));
    } finally {
      setProcessingId('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài viết nháp này?')) return;
    try {
      setProcessingId(id);
      await deleteBlogApi(id);
      await loadMyPosts();
    } catch (deleteError) {
      setError(extractApiError(deleteError, 'Không thể xóa bài viết.'));
    } finally {
      setProcessingId('');
    }
  };

  if (routeMeta.mode === 'create' || routeMeta.mode === 'edit') {
    return (
      <BlogEditor
        blogId={routeMeta.mode === 'edit' ? routeMeta.id : ''}
        onBack={() => navigate('/staff/blogs')}
        onSaved={() => navigate('/staff/blogs')}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý bài viết của tôi</h2>
          <p className="text-sm text-slate-500">Tạo, chỉnh sửa, gửi duyệt và theo dõi trạng thái bài viết.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/staff/blogs/new')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Tạo bài viết
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Tất cả' },
          { value: 'draft', label: 'Nháp' },
          { value: 'pending', label: 'Chờ duyệt' },
          { value: 'published', label: 'Đã xuất bản' },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatusFilter(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              statusFilter === item.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-600">Đang tải bài viết...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500">Chưa có bài viết phù hợp bộ lọc.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const status = toText(post?.status).toLowerCase();
            const isDraft = status === 'draft';
            const isRejected = status === 'rejected';
            const canSubmit = isDraft || isRejected;
            const busy = processingId === post._id;
            return (
              <article key={post._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {post?.thumbnail ? (
                  <img src={post.thumbnail} alt={post.title} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-500">Chưa có ảnh thumbnail</div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(status)}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(post?.updatedAt)}</span>
                  </div>
                  <h3 className="line-clamp-2 min-h-[3rem] text-sm font-semibold text-slate-900">{post?.title || 'Bài viết chưa có tiêu đề'}</h3>
                  <p className="text-xs text-slate-500">{post?.category || 'Chưa phân loại'}</p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/staff/blogs/${post._id}/edit`)}
                      className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit || busy}
                      onClick={() => handleSubmit(post._id)}
                      className="rounded-lg bg-amber-500 px-2 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Gửi duyệt
                    </button>
                    <button
                      type="button"
                      disabled={!isDraft || busy}
                      onClick={() => handleDelete(post._id)}
                      className="rounded-lg bg-rose-500 px-2 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
