import { useEffect, useState } from 'react';
import { approveBlogApi, getPendingBlogsApi, publishBlogApi, rejectBlogApi } from '../../services/blog.service';

const toText = (value) => String(value || '').trim();

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

export default function OwnerBlogsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [processingId, setProcessingId] = useState('');

  const loadPendingBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getPendingBlogsApi();
      setPosts(Array.isArray(response?.data) ? response.data : []);
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Không thể tải danh sách bài viết chờ duyệt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingBlogs();
  }, []);

  const handleAction = async (postId, action) => {
    try {
      setProcessingId(postId);
      if (action === 'approve') await approveBlogApi(postId);
      if (action === 'reject') await rejectBlogApi(postId);
      if (action === 'publish') await publishBlogApi(postId);
      await loadPendingBlogs();
    } catch (actionError) {
      setError(actionError?.response?.data?.message || 'Không thể cập nhật trạng thái bài viết.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Duyệt bài viết</h2>
        <p className="mt-1 text-sm text-slate-500">Owner duyệt, từ chối hoặc xuất bản các bài viết đang chờ duyệt.</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-xl bg-white p-5 text-sm text-slate-600">Đang tải bài viết chờ duyệt...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Không có bài viết nào đang chờ duyệt.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const busy = processingId === post._id;
            const hasApproved = Boolean(post?.approvedBy?._id || post?.approvedBy);
            return (
              <article key={post._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">{toText(post?.title) || 'Bài viết chưa có tiêu đề'}</h3>
                    <p className="text-sm text-slate-600">
                      Tác giả: <strong>{toText(post?.author?.name) || 'Ẩn danh'}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Danh mục: {toText(post?.category) || 'Chưa phân loại'} • Cập nhật: {formatDateTime(post?.updatedAt)}
                    </p>
                    {post?.thumbnail ? (
                      <img src={post.thumbnail} alt={post.title} className="mt-2 h-40 w-full max-w-sm rounded-lg object-cover" />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(post._id, 'approve')}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(post._id, 'reject')}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={busy || !hasApproved}
                      onClick={() => handleAction(post._id, 'publish')}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Xuất bản
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
