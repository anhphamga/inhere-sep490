import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart, RefreshCw } from 'lucide-react'
import { getOwnerProductsApi } from '../../services/owner.service'

const toNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const resolveLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return String(value?.vi || value?.en || '')
}

const formatPrice = (value) => `${toNumber(value, 0).toLocaleString('vi-VN')}đ`
const PAGE_SIZE = 10

const OwnerFavoriteProductsScreen = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getOwnerProductsApi({ lang: 'vi' })
      const rows = Array.isArray(response?.data) ? response.data : []
      setProducts(rows)
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể tải danh sách sản phẩm yêu thích')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const likeDiff = toNumber(b?.likeCount, 0) - toNumber(a?.likeCount, 0)
      if (likeDiff !== 0) return likeDiff
      return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''))
    })
  }, [products])

  const totalItems = sortedProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startItemIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE
  const endItemIndex = Math.min(startItemIndex + PAGE_SIZE, totalItems)
  const paginatedProducts = sortedProducts.slice(startItemIndex, endItemIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [products])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  if (loading) {
    return (
      <section className="owner-card p-6">
        <p className="text-sm text-slate-500">Đang tải danh sách sản phẩm được yêu thích...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="owner-card p-6">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Thử lại
        </button>
      </section>
    )
  }

  return (
    <section className="owner-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sản phẩm được yêu thích nhiều</h2>
          <p className="mt-1 text-sm text-slate-500">
            Danh sách sắp xếp theo lượt yêu thích giảm dần.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {sortedProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu sản phẩm yêu thích</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Giá thuê</th>
                  <th className="px-4 py-3">Lượt yêu thích</th>
                  <th className="px-4 py-3">Tồn khả dụng</th>
                  <th className="px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedProducts.map((product) => {
                  const productId = String(product?._id || '')
                  return (
                    <tr key={productId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product?.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={resolveLocalizedText(product?.name) || 'Sản phẩm'}
                              className="h-12 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-12 w-10 rounded-md bg-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium text-slate-800">
                              {resolveLocalizedText(product?.name) || 'Sản phẩm'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{resolveLocalizedText(product?.category) || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatPrice(product?.baseRentPrice)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                          <Heart size={12} />
                          {toNumber(product?.likeCount, 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{toNumber(product?.availableQuantity, 0)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/owner/products/${productId}`)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Hiển thị {startItemIndex + 1}-{endItemIndex} trên tổng {totalItems} sản phẩm
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm font-medium text-slate-700">
                Trang {safeCurrentPage}/{totalPages}
              </span>
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default OwnerFavoriteProductsScreen
