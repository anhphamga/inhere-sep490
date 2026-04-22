import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getRouteByRole, isDashboardRole } from '../../utils/auth'
import { loginSchema } from '../../validations/login.schema'
import { mapZodErrors, toTrimmedText } from '../../utils/validation/validation.rules'
import Header from '../../components/common/Header'
import logoImage from '../../assets/logo/logo.png'
import heroImage from '../../assets/banner/banner3.png'
import '../../style/AuthPages.css'

const PHONE_REGEX_VN = /^0\d{9}$/
const normalizeIdentifierInput = (value = '') => toTrimmedText(value).replace(/\s+/g, ' ')
const normalizeIdentifierForPhone = (value = '') => normalizeIdentifierInput(value).replace(/\s+/g, '')

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle } = useAuth()
  const redirectPath = location.state?.from?.pathname

  const [form, setForm] = useState({
    identifier: '',
    password: '',
    rememberMe: true
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const buildValidationState = (nextForm) => {
    const normalizedForm = {
      ...nextForm,
      identifier: normalizeIdentifierInput(nextForm.identifier),
      password: nextForm.password,
    }
    const parsed = loginSchema.safeParse(normalizedForm)
    const errors = parsed.success ? {} : mapZodErrors(parsed.error)

    const compactIdentifier = normalizeIdentifierForPhone(normalizedForm.identifier)
    const isEmailIdentifier = normalizedForm.identifier.includes('@')
    const isPhoneLike = !isEmailIdentifier && /^\+?\d+$/.test(compactIdentifier)
    if (isPhoneLike && !PHONE_REGEX_VN.test(compactIdentifier)) {
      errors.identifier = 'Số điện thoại phải đúng định dạng 0xxxxxxxxx.'
    }

    return { normalizedForm, parsed, errors }
  }

  const loginValidation = useMemo(() => buildValidationState(form), [form])
  const loginParseResult = useMemo(() => loginValidation.parsed, [loginValidation])
  const isFormValid = loginParseResult.success

  const applyFieldChange = (field, value) => {
    const nextForm = { ...form, [field]: value }
    setForm(nextForm)
    setError('')
    if (!fieldErrors[field]) return

    const nextValidation = buildValidationState(nextForm)
    const nextMessage = nextValidation.errors[field] || ''
    setFieldErrors((prev) => {
      if (!prev[field] && !nextMessage) return prev
      const next = { ...prev }
      if (nextMessage) next[field] = nextMessage
      else delete next[field]
      return next
    })
  }

  const handleFieldBlur = (field) => {
    const nextForm = field === 'identifier'
      ? { ...form, identifier: normalizeIdentifierInput(form.identifier) }
      : form
    if (nextForm !== form) setForm(nextForm)

    const nextValidation = buildValidationState(nextForm)
    const message = nextValidation.errors[field] || ''
    setFieldErrors((prev) => {
      if (!message) {
        if (!prev[field]) return prev
        const next = { ...prev }
        delete next[field]
        return next
      }
      if (prev[field] === message) return prev
      return { ...prev, [field]: message }
    })
  }

  const handleCredentialResponse = async (response) => {
    try {
      const data = await loginWithGoogle({
        idToken: response.credential,
        portal: 'customer'
      })
      const fallbackPath = getRouteByRole(data.user.role)
      const enforceRoleDashboard = isDashboardRole(data.user.role)
      const targetPath = enforceRoleDashboard ? fallbackPath : (redirectPath || fallbackPath)
      navigate(targetPath, { replace: true })
    } catch (err) {
      setError(normalizeLoginError(err))
    }
  }
  useEffect(() => {
    if (!window.google) return
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    })
    window.google.accounts.id.renderButton(
      document.getElementById('googleBtn'),
      {
        theme: 'outline',
        size: 'large',
        width: '100%'
      }
    )
  }, [])

  const normalizeLoginError = (apiError) => {
    const message = apiError?.response?.data?.message || ''
    const normalized = String(message).toLowerCase()

    if (normalized.includes('invalid') || normalized.includes('not found') || normalized.includes('password')) {
      return 'Email/SĐT hoặc mật khẩu không đúng'
    }

    if (normalized.includes('locked')) {
      return 'Tài khoản đang bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ'
    }

    if (normalized.includes('cho owner duyet') || normalized.includes('chờ owner duyệt') || normalized.includes('pending')) {
      return 'Tài khoản đang chờ owner duyệt'
    }

    if (normalized.includes('verify') || normalized.includes('kích hoạt')) {
      return 'Vui lòng xác minh email trước khi đăng nhập'
    }

    return message || 'Đăng nhập thất bại'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const { normalizedForm, parsed, errors: mappedErrors } = buildValidationState(form)
    if (!parsed.success || Object.keys(mappedErrors).length > 0) {
      setFieldErrors(mappedErrors)
      setError('Vui lòng kiểm tra lại thông tin đăng nhập.')
      return
    }

    if (normalizedForm.identifier !== form.identifier) {
      setForm((prev) => ({ ...prev, identifier: normalizedForm.identifier }))
    }

    setSubmitting(true)

    try {
      const identifier = normalizeIdentifierInput(parsed.data.identifier)
      const compactIdentifier = normalizeIdentifierForPhone(identifier)
      const password = parsed.data.password
      const isPhoneIdentifier = PHONE_REGEX_VN.test(compactIdentifier)
      const payload = isPhoneIdentifier
        ? { phone: compactIdentifier, password, portal: 'customer' }
        : { email: identifier.toLowerCase(), password, portal: 'customer' }

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
                  id="login-identifier"
                  type="text"
                  placeholder="Email hoặc số điện thoại"
                  value={form.identifier}
                  onChange={(event) => applyFieldChange('identifier', event.target.value)}
                  onBlur={() => handleFieldBlur('identifier')}
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.identifier)}
                  aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
                  className={fieldErrors.identifier ? 'border-rose-400 focus:border-rose-500' : ''}
                  required
                />
              </div>
              {fieldErrors.identifier ? <div id="login-identifier-error" className="error-text" role="alert">{fieldErrors.identifier}</div> : null}
            </div>

            <div className="auth-input-wrap">
              <label>Mật khẩu</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">*</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={(event) => applyFieldChange('password', event.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                  className={fieldErrors.password ? 'border-rose-400 focus:border-rose-500' : ''}
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
              {fieldErrors.password ? <div id="login-password-error" className="error-text" role="alert">{fieldErrors.password}</div> : null}
            </div>

            <div className="auth-row-between">
              <label className="remember-check">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(event) => {
                    setForm({ ...form, rememberMe: event.target.checked })
                    setError('')
                  }}
                />
                <span>Ghi nhớ tôi</span>
              </label>
              <Link to="/forgot-password" className="inline-link">Quên mật khẩu?</Link>
            </div>

            {error && <div className="error-text" role="alert">{error}</div>}

            <button type="submit" disabled={submitting || !isFormValid} className="login-submit-btn">
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className="auth-divider">
              <span>Hoặc</span>
            </div>

            <div id="googleBtn"></div>
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

