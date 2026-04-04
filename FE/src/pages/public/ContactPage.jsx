import { Link } from 'react-router-dom'
import { Clock3, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import Header from '../../components/common/Header'
import { CONTACT_LINKS } from '../../constants/ui'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfb_0%,#f8fafc_45%,#f8fafc_100%)]">
      <Header active="contact" />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <MessageCircle className="h-3.5 w-3.5" />
            Liên hệ INHERE
          </p>
          <h1 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">Hỗ trợ nhanh cho khách thuê và mua đồ</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            INHERE hỗ trợ tư vấn chọn trang phục, đặt lịch thử đồ, theo dõi đơn hàng và giải đáp chính sách thuê/mua.
            Bạn có thể liên hệ trực tiếp qua điện thoại, Zalo hoặc đến cửa hàng.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <a href="tel:0898199099" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Phone className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-sm text-slate-500">Hotline</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">0898 199 099</p>
          </a>

          <a href="mailto:inhere.contact@gmail.com" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Mail className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-sm text-slate-500">Thư điện tử</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">inhere.contact@gmail.com</p>
          </a>

          <a href={CONTACT_LINKS.zaloHref} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <MessageCircle className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-sm text-slate-500">Zalo</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Chat tư vấn ngay</p>
          </a>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Clock3 className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-sm text-slate-500">Giờ hoạt động</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">08:00 - 22:00</p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Địa chỉ cửa hàng</h2>
            <p className="mt-2 text-slate-600">24 Đào Duy Từ, Hội An, Quảng Nam</p>
            <a
              href={CONTACT_LINKS.mapHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
            >
              <MapPin className="h-4 w-4" />
              Mở bản đồ
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Tác vụ nhanh</h2>
            <div className="mt-4 space-y-3">
              <Link
                to="/buy?purpose=rent&openBooking=1"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold !text-white transition hover:bg-slate-800 hover:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
                style={{ color: '#ffffff' }}
              >
                <Send className="h-4 w-4 !text-white" />
                Đặt lịch thử đồ
              </Link>
              <Link
                to="/buy"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Xem sản phẩm
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
