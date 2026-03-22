import SectionCard from '../components/SectionCard';
import { mockBlogs } from '../mockData';

export default function BlogPage() {
  return (
    <SectionCard eyebrow="Content" title="Blog CMS" action={<button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">New article</button>}>
      <div className="grid gap-4">
        {mockBlogs.map((post) => (
          <div key={post.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                <p className="mt-1 text-sm text-slate-500">By {post.author} • {post.updatedAt}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Edit</button>
                <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{post.status === 'Published' ? 'Hide' : 'Publish'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
