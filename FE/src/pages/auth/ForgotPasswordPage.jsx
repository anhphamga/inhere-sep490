import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import MainHeader from '../../components/layout/MainHeader'
import { forgotPasswordApi, resetPasswordApi } from '../../services/auth.service'
import './AuthPages.css'

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
      setInfo('Đặt lại mật khẩu đã được gửi đến Gmail. Vui lòng kiểm tra email và nhấn vào link để đổi mật khẩu.')
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
      setError('Link đặt lại mật khẩu không hợp lệ hoặc đã thiếu token')
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

  return (
    <>
      <MainHeader />
      <div className="auth-shell auth-page auth-with-header">
        <div className="auth-layout">
          <section className="auth-showcase">
            <p className="auth-showcase-badge">INHERE HOI AN OUTFIT</p>
            <h1>Khôi phục mật khẩu tài khoản</h1>
            <p>Nhập Gmail để nhận link đặt lại mật khẩu, sau đó đổi mật khẩu trực tiếp từ link trong email.</p>
            <ul className="auth-showcase-points">
              <li>Áp dụng cho tài khoản đăng ký thường</li>
              <li>Tài khoản Google dùng nút đăng nhập Google</li>
              <li>Mật khẩu mới tối thiểu 6 ký tự</li>
            </ul>
          </section>

          <section className="auth-card auth-panel">
            <h2 className="auth-title">Quên mật khẩu</h2>
            <p className="auth-subtitle">Nhập Gmail để nhận link đổi mật khẩu.</p>

            {step === 'request' && (
              <form className="auth-form" onSubmit={handleRequestReset}>
                <div className="auth-input-wrap">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Nhập gmail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                {error && <div className="error-text">{error}</div>}
                {info && <div className="success-text">{info}</div>}

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Nhập gmail'}
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="auth-input-wrap">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div className="auth-input-wrap">
                  <label>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                {error && <div className="error-text">{error}</div>}
                {info && <div className="success-text">{info}</div>}

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </form>
            )}

            <div className="auth-links">
              <Link to="/login">Về đăng nhập</Link>
              <Link to="/signup">Chưa có tài khoản?</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default ForgotPasswordPage
