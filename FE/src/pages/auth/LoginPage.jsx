import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { getRouteByRole } from '../../utils/auth'
import './AuthPages.css'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const data = await login(form)
      const fallbackPath = getRouteByRole(data.user.role)
      const redirectPath = location.state?.from?.pathname || fallbackPath
      navigate(redirectPath, { replace: true })
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Đăng nhập để vào hệ thống theo quyền tài khoản của bạn.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Login'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/">Về trang chủ</Link>
          <Link to="/signup">Đăng ký customer</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
