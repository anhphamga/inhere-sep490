import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import './AuthPages.css'

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
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Create customer account</h1>
        <p className="auth-subtitle">Trang đăng ký chỉ dành cho customer. Owner là tài khoản có sẵn trong hệ thống.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Họ và tên"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Xác nhận mật khẩu"
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            required
          />

          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản...' : 'Signup'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/">Về trang chủ</Link>
          <Link to="/login">Đã có tài khoản?</Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
