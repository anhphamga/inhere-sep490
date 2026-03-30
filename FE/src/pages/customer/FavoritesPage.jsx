import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, Loader2, RefreshCcw, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/common/Header'
import { useFavorites } from '../../contexts/FavoritesContext'

const formatPrice = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const PAGE_SIZE = 8

export default function FavoritesPage() {
  const navigate = useNavigate()
  const {
    favoriteItems,
    loading,
    error,
    isFavoriteLoading,
    removeFavorite,
    hydrateFavorites,
  } = useFavorites()

  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = favoriteItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startItemIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE
  const endItemIndex = Math.min(startItemIndex + PAGE_SIZE, totalItems)

  const paginatedItems = useMemo(
    () => favoriteItems.slice(startItemIndex, endItemIndex),
    [favoriteItems, startItemIndex, endItemIndex]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [favoriteItems.length])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleRemove = async (id) => {
    await removeFavorite(id)
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] pb-16">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-[#6f2a3f] to-[#4b4f7e] px-5 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/75">INHERE</p>
              <h1 className="mt-2 text-3xl font-semibold">Sản phẩm yêu thích</h1>
              <p className="mt-2 text-sm text-white/85">
                Bạn đang lưu {favoriteItems.length} sản phẩm trong danh sách yêu thích.
              </p>
            </div>
            <button
              type="button"
              onClick={hydrateFavorites}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              <RefreshCcw size={14} />
              Làm mới
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center text-[#6c5f4d]">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Đang tải danh sách yêu thích...</p>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white"
              onClick={hydrateFavorites}
            >
              Thử lại
            </button>
          </section>
        ) : favoriteItems.length === 0 ? (
          <section className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#b08d57]" />
            <h2 className="mt-3 text-xl font-semibold text-[#3a3025]">Bạn chưa có sản phẩm yêu thích nào</h2>
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
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {paginatedItems.map((item) => (
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e5d4bc] text-[#b36a6a] transition hover:border-[#d37a7a] hover:text-[#c74646] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleRemove(item.id)}
                        disabled={isFavoriteLoading(item.id)}
                        aria-label="Xóa khỏi yêu thích"
                      >
                        {isFavoriteLoading(item.id) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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

            <div className="mt-6 rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-[#7a6c5a]">
                  Hiển thị {startItemIndex + 1}-{endItemIndex} trên tổng {totalItems} sản phẩm yêu thích
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#eadfce] text-[#7a6c5a] hover:bg-[#f6f3ee] disabled:opacity-50"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-sm font-medium text-[#3a3025]">
                    Trang {safeCurrentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#eadfce] text-[#7a6c5a] hover:bg-[#f6f3ee] disabled:opacity-50"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
