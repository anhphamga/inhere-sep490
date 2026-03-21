import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TicketPercent } from 'lucide-react'
import Header from '../../components/common/Header'
import { getMyVouchersApi } from '../../services/voucher.service'

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const formatVoucherValue = (voucher) => {
  if (voucher.voucherType === 'percent') {
    const maxDiscount = voucher.maxDiscount ? `, tối đa ${formatMoney(voucher.maxDiscount)}` : ''
    return `Giảm ${voucher.value}%${maxDiscount}`
  }

  return `Giảm ${formatMoney(voucher.value)}`
}

export default function MyVouchersPage() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await getMyVouchersApi()
        setVouchers(response.data || [])
      } catch {
        setError('Không thể tải danh sách voucher của bạn lúc này.')
      } finally {
        setLoading(false)
      }
    }

    fetchVouchers()
  }, [])

  return (
    <div className="min-h-screen bg-[#f6f3ee] pb-16">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-[#25436f] to-[#6f5b2a] px-5 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/75">INHERE</p>
          <h1 className="mt-2 text-3xl font-semibold">Voucher của tôi</h1>
          <p className="mt-2 text-sm text-white/85">
            Các voucher hiện còn khả dụng với tài khoản của bạn.
          </p>
        </section>

        {loading && (
          <section className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#b08d57] border-t-transparent" />
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-[#f0c9c9] bg-white p-8 text-center text-[#b23b3b]">
            {error}
          </section>
        )}

        {!loading && !error && vouchers.length === 0 && (
          <section className="rounded-2xl border border-[#eadfce] bg-white p-8 text-center">
            <TicketPercent className="mx-auto h-10 w-10 text-[#b08d57]" />
            <h2 className="mt-3 text-xl font-semibold text-[#3a3025]">Hiện chưa có voucher phù hợp</h2>
            <p className="mt-2 text-sm text-[#7a6c5a]">
              Hãy tiếp tục mua sắm hoặc theo dõi các chương trình khuyến mãi mới từ INHERE.
            </p>
            <Link
              to="/buy"
              className="mt-5 inline-flex rounded-full bg-[#b08d57] px-5 py-2 text-sm font-semibold text-white"
            >
              Đi đến trang mua trang phục
            </Link>
          </section>
        )}

        {!loading && !error && vouchers.length > 0 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vouchers.map((voucher) => (
              <article
                key={voucher._id}
                className="rounded-2xl border border-[#eadfce] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9a7a49]">Mã voucher</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#3a3025]">{voucher.code}</h2>
                  </div>
                  <span className="rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-semibold text-[#8b6a35]">
                    {voucher.appliesTo === 'both'
                      ? 'Thuê & mua'
                      : voucher.appliesTo === 'rental'
                        ? 'Đơn thuê'
                        : 'Đơn mua'}
                  </span>
                </div>

                <p className="mt-3 text-base font-semibold text-[#7b1f39]">{formatVoucherValue(voucher)}</p>
                <p className="mt-2 text-sm text-[#5e5347]">
                  {voucher.name || voucher.description || 'Voucher ưu đãi từ INHERE'}
                </p>

                <div className="mt-4 space-y-2 text-sm text-[#6d6257]">
                  <p>Đơn tối thiểu: {formatMoney(voucher.minOrderValue)}</p>
                  <p>Hết hạn: {voucher.endDate ? new Date(voucher.endDate).toLocaleString('vi-VN') : 'Không giới hạn'}</p>
                  <p>
                    Giới hạn mỗi tài khoản:{' '}
                    {voucher.usageLimitPerUser ? `Tối đa ${voucher.usageLimitPerUser} lần` : 'Không giới hạn'}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
