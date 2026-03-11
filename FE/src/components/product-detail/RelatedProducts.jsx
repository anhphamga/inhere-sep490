import { Link } from "react-router-dom";

export default function RelatedProducts({ items = [], loading = false }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">San pham lien quan</h3>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="h-36 animate-pulse bg-neutral-200" />
              <div className="space-y-2 p-3">
                <div className="h-4 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(items.length ? items : []).map((item) => (
            <Link
              key={item._id}
              to={`/products/${item._id}`}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="h-44 bg-neutral-100">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name || "product"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">No image</div>
                )}
              </div>
              <div className="p-4">
                <p className="min-h-[44px] text-sm font-semibold leading-5 text-neutral-900">{item.name || "San pham"}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">{item.category || "Danh muc"}</p>
              </div>
            </Link>
          ))}

          {items.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
              Chua co san pham lien quan
            </div>
          )}
        </div>
      )}
    </section>
  );
}
