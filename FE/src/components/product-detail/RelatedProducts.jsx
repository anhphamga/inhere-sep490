import { Link } from "react-router-dom";

export default function RelatedProducts({ items = [], loading = false }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Có thể bạn cũng thích</h3>
        <Link to="/buy" className="text-sm font-medium text-slate-500 hover:text-slate-700">Xem tất cả &rarr;</Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="aspect-3/4 animate-pulse bg-slate-100" />
              <div className="space-y-2 p-3">
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item._id}
              to={`/products/${item._id}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
            >
              <div className="aspect-3/4 bg-slate-50">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name || "product"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                )}
              </div>
              <div className="space-y-0.5 p-3">
                <p className="truncate text-sm font-semibold text-slate-900">{item.name || "Sản phẩm"}</p>
                <p className="text-xs text-slate-400">{item.brand || item.category || "Inhere"}</p>
                <p className="text-sm font-bold text-slate-800">{Number(item.baseRentPrice || 0).toLocaleString("vi-VN")}đ <span className="font-normal text-slate-400">/ ngày</span></p>
              </div>
            </Link>
          ))}

          {items.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-400">
              Chưa có sản phẩm liên quan
            </p>
          )}
        </div>
      )}
    </section>
  );
}
