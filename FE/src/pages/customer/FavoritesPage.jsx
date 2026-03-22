import { Heart, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/common/Header'
import { useFavorites } from '../../contexts/FavoritesContext'

const formatPrice = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { favoriteItems, removeFavorite } = useFavorites()

  return (
    <div className="min-h-screen bg-[#f6f3ee] pb-16">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-[#6f2a3f] to-[#4b4f7e] px-5 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/75">INHERE</p>
          <h1 className="mt-2 text-3xl font-semibold">Sản phẩm yêu thích</h1>
          <p className="mt-2 text-sm text-white/85">
            Bạn đang lưu {favoriteItems.length} sản phẩm trong danh sách yêu thích.
          </p>
        </section>

        {favoriteItems.length === 0 ? (
          <section className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#b08d57]" />
            <h2 className="mt-3 text-xl font-semibold text-[#3a3025]">Chưa có sản phẩm yêu thích</h2>
            <p className="mt-2 text-sm text-[#7a6c5a]">
              Nhấn vào biểu tượng trái tim ở trang sản phẩm để lưu nhanh sản phẩm bạn quan tâm.
            </p>
            <button
              type="button"
              className="mt-5 rounded-full bg-[#b08d57] px-5 py-2 text-sm font-semibold text-white"
              onClick={() => navigate('/buy')}
            >
              Đi đến trang mua trang phục
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-sm">
                <Link to={`/products/${item.id}`} className="block">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-64 w-full object-cover" />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">
                      Không có ảnh
                    </div>
                  )}
                </Link>
                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-[48px] text-base font-semibold text-[#3a3025]">
                    <Link to={`/products/${item.id}`}>{item.name || 'Sản phẩm'}</Link>
                  </h3>
                  <p className="mt-2 text-lg font-bold text-[#cb1e3c]">{formatPrice(item.price)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e5d4bc] text-[#b36a6a] transition hover:border-[#d37a7a] hover:text-[#c74646]"
                      onClick={() => removeFavorite(item.id)}
                      aria-label="Xóa khỏi yêu thích"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="h-9 flex-1 rounded-full bg-[#b08d57] px-3 text-sm font-semibold text-white"
                      onClick={() => navigate(`/products/${item.id}`)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

