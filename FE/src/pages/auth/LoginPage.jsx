import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { getRouteByRole } from '../../utils/auth'
import { loadGoogleIdentityScript } from '../../utils/googleIdentity'
import MainHeader from '../../components/layout/MainHeader'
import './AuthPages.css'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle } = useAuth()
  const googleButtonRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectPath = location.state?.from?.pathname

  const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

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
              setError('Không lấy được thông tin Google đăng nhập')
              return
            }

            try {
              setError('')
              setGoogleSubmitting(true)
              const data = await loginWithGoogle({ idToken: response.credential })
              const fallbackPath = getRouteByRole(data.user.role)
              navigate(redirectPath || fallbackPath, { replace: true })
            } catch (apiError) {
              setError(apiError?.response?.data?.message || 'Google login failed')
            } finally {
              setGoogleSubmitting(false)
            }
          }
        })

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 360
        })
      })
      .catch(() => {
        setError('Không thể tải Google Sign-In')
      })

    return () => {
      cancelled = true
    }
  }, [googleClientId, loginWithGoogle, navigate, redirectPath])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const data = await login(form)
      const fallbackPath = getRouteByRole(data.user.role)
      navigate(redirectPath || fallbackPath, { replace: true })
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <MainHeader />
      <div className="auth-shell auth-page auth-with-header">
        <div className="auth-layout">
          <section className="auth-showcase">
            <p className="auth-showcase-badge">INHERE HOI AN OUTFIT</p>
            <h1>Đăng nhập để tiếp tục đặt thuê trang phục</h1>
            <p>Quản lý hồ sơ, theo dõi lịch đặt và cập nhật ảnh đại diện của bạn tại một nơi.</p>
            <ul className="auth-showcase-points">
              <li>Đăng nhập nhanh bằng email</li>
              <li>Phân luồng owner và customer</li>
              <li>Bảo mật tài khoản với đổi mật khẩu</li>
            </ul>
          </section>

          <section className="auth-card auth-panel">
            <div className="auth-tabs">
              <span className="auth-tab auth-tab-active">Đăng nhập</span>
              <Link to="/signup" className="auth-tab">Đăng ký</Link>
            </div>

            <h2 className="auth-title">Xin chào trở lại</h2>
            <p className="auth-subtitle">Nhập tài khoản của bạn để vào hệ thống.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-wrap">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
              <div className="auth-input-wrap">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
              </div>
              {error && <div className="error-text">{error}</div>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className="auth-divider">
                <span>hoặc</span>
              </div>

              {googleClientId ? (
                <div className="google-login-wrap" ref={googleButtonRef} />
              ) : (
                <p className="google-login-disabled">Thiếu cấu hình Google Client ID</p>
              )}

              {googleSubmitting && <div className="auth-google-loading">Đang xác thực Google...</div>}
            </form>

            <div className="auth-links">
              <Link to="/forgot-password">Quên mật khẩu</Link>
              <Link to="/signup">Chưa có tài khoản?</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default LoginPage
