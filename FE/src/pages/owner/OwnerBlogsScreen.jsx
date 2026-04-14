import { useEffect, useState } from 'react';
import {
  approveBlogApi,
  getApprovedBlogsApi,
  getPendingBlogsApi,
  publishBlogApi,
  rejectBlogApi,
} from '../../services/blog.service';

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
  const [pendingPosts, setPendingPosts] = useState([]);
  const [approvedPosts, setApprovedPosts] = useState([]);
  const [processingId, setProcessingId] = useState('');

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const [pendingResponse, approvedResponse] = await Promise.all([
        getPendingBlogsApi(),
        getApprovedBlogsApi(),
      ]);

      const pendingData = Array.isArray(pendingResponse?.data) ? pendingResponse.data : [];
      const approvedData = Array.isArray(approvedResponse?.data) ? approvedResponse.data : [];

      setPendingPosts(pendingData.filter((post) => !post?.approvedBy));
      setApprovedPosts(approvedData);
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Không thể tải danh sách bài viết.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleAction = async (postId, action) => {
    try {
      setProcessingId(postId);
      if (action === 'approve') await approveBlogApi(postId);
      if (action === 'reject') await rejectBlogApi(postId);
      if (action === 'publish') await publishBlogApi(postId);
      await loadBlogs();
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
        <p className="mt-1 text-sm text-slate-500">
          Owner duyệt, từ chối hoặc xuất bản bài viết. Bạn có thể xem cả danh sách đã được duyệt.
        </p>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-xl bg-white p-5 text-sm text-slate-600">Đang tải danh sách bài viết...</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Bài viết chờ duyệt</h3>
            {pendingPosts.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-sm text-slate-500">Không có bài viết nào đang chờ duyệt.</div>
            ) : (
              pendingPosts.map((post) => {
                const busy = processingId === post._id;
                return (
                  <article key={post._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h4 className="text-lg font-semibold text-slate-900">{toText(post?.title) || 'Bài viết chưa có tiêu đề'}</h4>
                        <p className="text-sm text-slate-600">
                          Tác giả: <strong>{toText(post?.author?.name) || 'Ẩn danh'}</strong>
                        </p>
                        <p className="text-xs text-slate-500">
                          Danh mục: {toText(post?.category) || 'Chưa phân loại'} {' - '} Cập nhật: {formatDateTime(post?.updatedAt)}
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
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Bài viết đã duyệt</h3>
            {approvedPosts.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-sm text-slate-500">Chưa có bài viết nào được duyệt.</div>
            ) : (
              approvedPosts.map((post) => {
                const busy = processingId === post._id;
                const isPublished = toText(post?.status).toLowerCase() === 'published';
                return (
                  <article key={post._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h4 className="text-lg font-semibold text-slate-900">{toText(post?.title) || 'Bài viết chưa có tiêu đề'}</h4>
                        <p className="text-sm text-slate-600">
                          Tác giả: <strong>{toText(post?.author?.name) || 'Ẩn danh'}</strong> {' - '} Người duyệt:{' '}
                          <strong>{toText(post?.approvedBy?.name) || 'Không rõ'}</strong>
                        </p>
                        <p className="text-xs text-slate-500">
                          Trạng thái: {isPublished ? 'Đã xuất bản' : 'Đã duyệt'} {' - '} Cập nhật: {formatDateTime(post?.updatedAt)}
                        </p>
                        {post?.thumbnail ? (
                          <img src={post.thumbnail} alt={post.title} className="mt-2 h-40 w-full max-w-sm rounded-lg object-cover" />
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || isPublished}
                          onClick={() => handleAction(post._id, 'publish')}
                          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Xuất bản
                        </button>
                        <button
                          type="button"
                          disabled={busy || isPublished}
                          onClick={() => handleAction(post._id, 'reject')}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </section>
  );
}
