import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import MainHeader from '../../components/layout/MainHeader'
import '../../style/AuthPages.css'

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedName = form.name.trim()
    const trimmedPhone = form.phone.trim()
    const trimmedEmail = form.email.trim()

    if (!trimmedName || !trimmedPhone || !trimmedEmail || !form.password || !form.confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Email không hợp lệ')
      return
    }

    const phoneRegex = /^[0-9]{8,15}$/
    if (!phoneRegex.test(trimmedPhone)) {
      setError('Số điện thoại chỉ gồm 8-15 chữ số')
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
      setError(apiError?.response?.data?.message || 'Signup failed')
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
            <h1>Tạo tài khoản customer trong vài bước</h1>
            <p>Đăng ký để lưu thông tin hồ sơ, đặt lịch nhanh hơn và quản lý tài khoản thuận tiện.</p>
            <ul className="auth-showcase-points">
              <li>Đăng ký bằng email và số điện thoại</li>
              <li>Xác nhận mật khẩu ngay trên form</li>
              <li>Sẵn sàng cập nhật hồ sơ sau khi vào hệ thống</li>
            </ul>
          </section>

          <section className="auth-card auth-panel">
            <div className="auth-tabs">
              <Link to="/login" className="auth-tab">Đăng nhập</Link>
              <span className="auth-tab auth-tab-active">Đăng ký</span>
            </div>

            <h2 className="auth-title">Tạo tài khoản customer</h2>
            <p className="auth-subtitle">Owner sử dụng tài khoản được cấp sẵn từ hệ thống.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-wrap">
                <label>Họ và tên</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="auth-input-wrap">
                <label>Số điện thoại</label>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  required
                />
              </div>
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
                  minLength={6}
                  required
                />
              </div>
              <div className="auth-input-wrap">
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  required
                />
              </div>

              {error && <div className="error-text">{error}</div>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/forgot-password">Quên mật khẩu</Link>
              <Link to="/login">Đã có tài khoản?</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default SignupPage
