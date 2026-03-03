import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import logoImage from '../../assets/logo/logo.png'
import heroImage from '../../assets/banner/banner3.png'
import '../../style/AuthPages.css'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\d{10,11}$/

const SignupPage = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedName = form.name.trim()
    const trimmedPhone = form.phone.trim()
    const trimmedEmail = form.email.trim().toLowerCase()

    if (!trimmedName || !trimmedPhone || !trimmedEmail || !form.password || !form.confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Email không hợp lệ')
      return
    }

    if (!phoneRegex.test(trimmedPhone)) {
      setError('Số điện thoại phải gồm 10-11 chữ số')
      return
    }

    if (form.password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setSubmitting(true)

    try {
      await signup({
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        password: form.password
      })
      navigate('/', { replace: true })
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell auth-page login-page-shell">
      <div className="auth-layout auth-layout-login">
        <section
          className="auth-showcase login-hero"
          style={{ backgroundImage: `linear-gradient(rgba(35, 22, 7, 0.55), rgba(35, 22, 7, 0.62)), url(${heroImage})` }}
        >
          <div className="login-hero-top">
            <img src={logoImage} alt="INHERE" className="login-hero-logo" />
            <p className="auth-showcase-badge">INHERE - HOI AN COSTUME</p>
          </div>

          <div className="login-hero-copy">
            <h1>INHERE - Hội An Costume</h1>
            <p className="login-hero-slogan">Thuê & mua trang phục truyền thống - nhận nhanh tại Hội An</p>
          </div>

          <ul className="auth-showcase-points login-benefits">
            <li><span className="benefit-icon">✓</span><span>Thuê nhanh - đặt lịch nhận</span></li>
            <li><span className="benefit-icon">✓</span><span>Cọc minh bạch - hỗ trợ đổi size</span></li>
            <li><span className="benefit-icon">✓</span><span>Hỗ trợ khách du lịch đa ngôn ngữ</span></li>
          </ul>
        </section>

        <section className="auth-card auth-panel login-form-card">
          <h2 className="auth-title">Đăng ký để đặt thuê nhanh hơn</h2>
          <p className="auth-subtitle">Tạo tài khoản để lưu thông tin, theo dõi đơn thuê và nhận ưu đãi thành viên.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-wrap">
              <label>Họ và tên</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">U</span>
                <input
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="auth-input-wrap">
              <label>Số điện thoại</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">#</span>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <div className="auth-input-wrap">
              <label>Email</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">@</span>
                <input
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-input-wrap">
              <label>Mật khẩu</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">*</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="auth-input-wrap">
              <label>Xác nhận mật khẩu</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">*</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                >
                  {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" disabled={submitting} className="login-submit-btn">
              {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <div className="auth-links auth-links-center">
            <span>Đã có tài khoản?</span>
            <Link to="/login">Đăng nhập</Link>
          </div>

          <p className="auth-foot-note auth-terms-note">Bằng việc đăng ký, bạn đồng ý Điều khoản & Chính sách.</p>
        </section>
      </div>
    </div>
  )
}

export default SignupPage
