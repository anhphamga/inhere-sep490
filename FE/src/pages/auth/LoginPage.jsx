import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getRouteByRole, isDashboardRole } from '../../utils/auth'
import { loadGoogleIdentityScript } from '../../utils/googleIdentity'
import Header from '../../components/common/Header'
import logoImage from '../../assets/logo/logo.png'
import heroImage from '../../assets/banner/banner3.png'
import '../../style/AuthPages.css'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^(0|\+84)\d{9,10}$/

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle } = useAuth()
  const googleButtonRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectPath = location.state?.from?.pathname

  const [form, setForm] = useState({
    identifier: '',
    password: '',
    rememberMe: true
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return
    }

    let cancelled = false

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response?.credential) {
              setError('Không lấy được thông tin đăng nhập Google')
              return
            }

            try {
              setError('')
              const data = await loginWithGoogle({ idToken: response.credential })
              const fallbackPath = getRouteByRole(data.user.role)
              const enforceRoleDashboard = isDashboardRole(data.user.role)
              const targetPath = enforceRoleDashboard ? fallbackPath : (redirectPath || fallbackPath)
              navigate(targetPath, { replace: true })
            } catch (apiError) {
              setError(apiError?.response?.data?.message || 'Đăng nhập Google thất bại')
            }
          }
        })

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          locale: 'vi',
          width: 360
        })
      })
      .catch(() => {
        setError('Không thể tải nút đăng nhập Google')
      })

    return () => {
      cancelled = true
    }
  }, [googleClientId, loginWithGoogle, navigate, redirectPath])

  const normalizeLoginError = (apiError) => {
    const message = apiError?.response?.data?.message || ''
    const normalized = String(message).toLowerCase()

    if (normalized.includes('invalid') || normalized.includes('not found') || normalized.includes('password')) {
      return 'Email/SĐT hoặc mật khẩu không đúng'
    }

    if (normalized.includes('locked')) {
      return 'Tài khoản đang bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ'
    }

    if (normalized.includes('verify') || normalized.includes('kích hoạt')) {
      return 'Vui lòng xác minh email trước khi đăng nhập'
    }

    return message || 'Đăng nhập thất bại'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const identifier = form.identifier.replace(/\s+/g, '').trim()
    const password = form.password

    if (!identifier || !password) {
      setError('Vui lòng nhập đầy đủ thông tin đăng nhập')
      return
    }

    const isEmail = emailRegex.test(identifier)
    const isPhone = phoneRegex.test(identifier)

    if (!isEmail && !isPhone) {
      setError('Vui lòng nhập đúng Email hoặc số điện thoại hợp lệ')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }

    setSubmitting(true)

    try {
      const payload = isPhone
        ? { phone: identifier, password }
        : { email: identifier.toLowerCase(), password }

      const data = await login(payload, { rememberMe: form.rememberMe })
      const fallbackPath = getRouteByRole(data.user.role)
      const enforceRoleDashboard = isDashboardRole(data.user.role)
      const targetPath = enforceRoleDashboard ? fallbackPath : (redirectPath || fallbackPath)
      navigate(targetPath, { replace: true })
    } catch (apiError) {
      setError(normalizeLoginError(apiError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <div className="auth-shell auth-page auth-with-header login-page-shell">
        <div className="auth-layout auth-layout-login">
        <section
          className="auth-showcase login-hero"
          style={{ backgroundImage: `linear-gradient(rgba(35, 22, 7, 0.55), rgba(35, 22, 7, 0.62)), url(${heroImage})` }}
        >
          <div className="login-hero-top">
            <img src={logoImage} alt="INHERE" className="login-hero-logo" />
            <p className="auth-showcase-badge">INHERE - TRANG PHỤC HỘI AN</p>
          </div>

          <div className="login-hero-copy">
            <h1>INHERE - Trang phục Hội An</h1>
            <p className="login-hero-slogan">Thuê & mua trang phục truyền thống - nhận nhanh tại Hội An</p>
          </div>

          <ul className="auth-showcase-points login-benefits">
            <li><span className="benefit-icon">✓</span><span>Thuê nhanh - đặt lịch nhận</span></li>
            <li><span className="benefit-icon">✓</span><span>Cọc minh bạch - hỗ trợ đổi size</span></li>
            <li><span className="benefit-icon">✓</span><span>Hỗ trợ khách du lịch đa ngôn ngữ</span></li>
          </ul>
        </section>

        <section className="auth-card auth-panel login-form-card">
          <h2 className="auth-title">Đăng nhập để đặt thuê nhanh hơn</h2>
          <p className="auth-subtitle">Chào mừng bạn quay lại. Lưu thông tin, theo dõi đơn thuê, nhận ưu đãi thành viên.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-wrap">
              <label>Email / SĐT</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">@</span>
                <input
                  type="text"
                  placeholder="Email hoặc số điện thoại"
                  value={form.identifier}
                  onChange={(event) => setForm({ ...form, identifier: event.target.value })}
                  autoComplete="username"
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
                  autoComplete="current-password"
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

            <div className="auth-row-between">
              <label className="remember-check">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(event) => setForm({ ...form, rememberMe: event.target.checked })}
                />
                <span>Ghi nhớ tôi</span>
              </label>
              <Link to="/forgot-password" className="inline-link">Quên mật khẩu?</Link>
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" disabled={submitting} className="login-submit-btn">
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>



            {googleClientId ? (
              <>
                <div className="google-login-wrap" ref={googleButtonRef} />
              </>
            ) : (
              <p className="google-login-disabled">Thiếu cấu hình Google Client ID</p>
            )}
          </form>

          <div className="auth-links auth-links-center">
            <span>Chưa có tài khoản?</span>
            <Link to="/signup">Đăng ký</Link>
          </div>

          <p className="auth-foot-note auth-terms-note">Bằng việc đăng nhập, bạn đồng ý Điều khoản & Chính sách.</p>
        </section>
        </div>
      </div>
    </>
  )
}

export default LoginPage
