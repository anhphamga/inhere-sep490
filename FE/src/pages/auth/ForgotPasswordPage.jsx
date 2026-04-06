import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { forgotPasswordApi, resetPasswordApi } from '../../services/auth.service'
import Header from '../../components/common/Header'
import logoImage from '../../assets/logo/logo.png'
import heroImage from '../../assets/banner/banner3.png'
import '../../style/AuthPages.css'

const ForgotPasswordPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('request')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const queryToken = params.get('token') || ''
    const queryEmail = params.get('email') || ''

    if (queryEmail) {
      setEmail(queryEmail)
    }

    if (queryToken) {
      setToken(queryToken)
      setStep('reset')
      setInfo('Link hợp lệ. Bạn hãy nhập mật khẩu mới để hoàn tất đặt lại mật khẩu.')
    }
  }, [location.search])

  const handleRequestReset = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    try {
      await forgotPasswordApi({ email: email.trim() })
      setInfo('Yêu cầu đã được gửi. Vui lòng kiểm tra email để mở link đặt lại mật khẩu.')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể xử lý yêu cầu quên mật khẩu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!token.trim()) {
      setError('Link đặt lại mật khẩu không hợp lệ hoặc thiếu token')
      return
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp')
      return
    }

    setSubmitting(true)
    try {
      await resetPasswordApi({ token: token.trim(), newPassword })
      setInfo('Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Đặt lại mật khẩu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const isResetStep = step === 'reset'

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
              <p className="auth-showcase-badge">KHÔI PHỤC TÀI KHOẢN</p>
            </div>

            <div className="login-hero-copy">
              <h1>{isResetStep ? 'Đặt lại mật khẩu mới' : 'Lấy lại mật khẩu trong vài bước'}</h1>
              <p className="login-hero-slogan">
                {isResetStep
                  ? 'Bạn đang ở bước cuối. Hãy tạo mật khẩu mới để quay lại đặt thuê nhanh cùng INHERE.'
                  : 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu một cách an toàn.'}
              </p>
            </div>

            <ul className="auth-showcase-points login-benefits">
              <li><span className="benefit-icon">1</span><span>Nhập đúng email đã dùng để đăng ký tài khoản</span></li>
              <li><span className="benefit-icon">2</span><span>Mở email và truy cập liên kết đặt lại mật khẩu</span></li>
              <li><span className="benefit-icon">3</span><span>Tạo mật khẩu mới có ít nhất 6 ký tự</span></li>
            </ul>
          </section>

          <section className="auth-card auth-panel login-form-card forgot-password-card">
            <div className="forgot-stepper" role="status" aria-live="polite">
              <span className={`forgot-step-pill ${!isResetStep ? 'active' : ''}`}>1. Nhập email</span>
              <span className={`forgot-step-pill ${isResetStep ? 'active' : ''}`}>2. Đặt lại mật khẩu</span>
            </div>

            <h2 className="auth-title">Quên mật khẩu</h2>
            <p className="auth-subtitle">
              {isResetStep
                ? 'Tạo mật khẩu mới để hoàn tất quá trình khôi phục tài khoản.'
                : 'Nhập email đăng ký để nhận liên kết đổi mật khẩu.'}
            </p>

            {step === 'request' && (
              <form className="auth-form" onSubmit={handleRequestReset}>
                <div className="auth-input-wrap">
                  <label>Email</label>
                  <div className="auth-input-icon-wrap">
                    <span className="auth-input-icon" aria-hidden="true">@</span>
                    <input
                      type="email"
                      placeholder="Nhập email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <p className="forgot-hint-text">Liên kết đặt lại sẽ được gửi đến hộp thư của bạn trong ít phút.</p>

                {error && <div className="error-text">{error}</div>}
                {info && <div className="success-text">{info}</div>}

                <button type="submit" disabled={submitting} className="login-submit-btn">
                  {submitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form className="auth-form" onSubmit={handleResetPassword}>
                {email && (
                  <div className="auth-input-wrap">
                    <label>Email nhận liên kết</label>
                    <div className="auth-input-icon-wrap">
                      <span className="auth-input-icon" aria-hidden="true">@</span>
                      <input type="email" value={email} readOnly aria-readonly="true" />
                    </div>
                  </div>
                )}

                <div className="auth-input-wrap">
                  <label>Mật khẩu mới</label>
                  <div className="auth-input-icon-wrap">
                    <span className="auth-input-icon" aria-hidden="true">*</span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={6}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                    >
                      {showNewPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="auth-input-wrap">
                  <label>Xác nhận mật khẩu mới</label>
                  <div className="auth-input-icon-wrap">
                    <span className="auth-input-icon" aria-hidden="true">*</span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
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
                {info && <div className="success-text">{info}</div>}

                <button type="submit" disabled={submitting} className="login-submit-btn">
                  {submitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </form>
            )}

            <div className="auth-links auth-links-center forgot-links">
              <Link to="/login">Về đăng nhập</Link>
              <span className="forgot-link-divider">•</span>
              <Link to="/signup">Tạo tài khoản mới</Link>
            </div>

            <p className="auth-foot-note auth-terms-note">Nếu không thấy email, hãy kiểm tra thư mục Spam hoặc Promotions.</p>
          </section>
        </div>
      </div>
    </>
  )
}

export default ForgotPasswordPage
