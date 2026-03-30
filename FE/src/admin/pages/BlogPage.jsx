import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';
import StatusBadge from '../components/StatusBadge';

export default function BlogPage() {
  const { t } = useTranslate();
  const blogPosts = [];

  return (
    <SectionCard eyebrow={t('admin.blog.eyebrow')} title={t('admin.blog.title')} action={<button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t('admin.blog.newArticle')}</button>}>
      <div className="grid gap-4">
        {blogPosts.map((post) => (
          <div key={post.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                <p className="mt-1 text-sm text-slate-500">{t('admin.blog.by')} {post.author} • {post.updatedAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{t('common.edit')}</button>
                <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{post.status === 'Published' ? t('admin.blog.hide') : t('admin.blog.publish')}</button>
                <StatusBadge value={post.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

