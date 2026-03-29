import { Link } from 'react-router-dom';

export default function RelatedCollections({ collections = [] }) {
  if (!collections.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Bộ Sưu Tập Liên Quan</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {collections.map((collection) => {
          const slug = collection?.slug || collection?._id || '';
          const image = collection?.banner || collection?.image || '';
          return (
            <Link
              key={slug || collection?.name}
              to={slug ? `/collections/${slug}` : '#'}
              className="group overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[16/10] overflow-hidden bg-amber-50">
                {image ? (
                  <img
                    src={image}
                    alt={collection?.name || 'related-collection'}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có ảnh</div>
                )}
              </div>
              <div className="p-3.5">
                <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{collection?.name || 'Collection'}</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{collection?.description || ''}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

