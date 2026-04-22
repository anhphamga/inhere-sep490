import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Header from '../../components/common/Header'
import { registerSchema } from '../../validations/register.schema'
import { mapZodErrors, normalizePhone, toTrimmedText } from '../../utils/validation/validation.rules'
import logoImage from '../../assets/logo/logo.png'
import heroImage from '../../assets/banner/banner3.png'
import '../../style/AuthPages.css'

const PHONE_REGEX_VN = /^0\d{9}$/
const normalizeTextInput = (value = '') => toTrimmedText(value).replace(/\s+/g, ' ')
const normalizeEmailInput = (value = '') => normalizeTextInput(value).toLowerCase()
const normalizePhoneInput = (value = '') => normalizePhone(value)

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
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const buildValidationState = (nextForm) => {
    const normalizedForm = {
      ...nextForm,
      name: normalizeTextInput(nextForm.name),
      phone: normalizePhoneInput(nextForm.phone),
      email: normalizeEmailInput(nextForm.email),
      password: nextForm.password,
      confirmPassword: nextForm.confirmPassword,
    }

    const parsed = registerSchema.safeParse(normalizedForm)
    const errors = parsed.success ? {} : mapZodErrors(parsed.error)

    if (normalizedForm.phone && !PHONE_REGEX_VN.test(normalizedForm.phone)) {
      errors.phone = 'Số điện thoại phải đúng định dạng 0xxxxxxxxx.'
    }

    if (normalizedForm.password) {
      const hasUppercase = /[A-Z]/.test(normalizedForm.password)
      const hasNumber = /\d/.test(normalizedForm.password)
      if (!hasUppercase || !hasNumber) {
        errors.password = errors.password || 'Mật khẩu phải có ít nhất 1 chữ hoa và 1 số.'
      }
    }

    if (normalizedForm.confirmPassword && normalizedForm.password !== normalizedForm.confirmPassword) {
      errors.confirmPassword = errors.confirmPassword || 'Mật khẩu xác nhận không khớp.'
    }

    return { normalizedForm, parsed, errors }
  }

  const registerValidation = useMemo(() => buildValidationState(form), [form])
  const registerParseResult = useMemo(() => registerValidation.parsed, [registerValidation])
  const isFormValid = registerParseResult.success

  const applyFieldChange = (field, value) => {
    const nextForm = { ...form, [field]: value }
    setForm(nextForm)
    setError('')

    const nextValidation = buildValidationState(nextForm)
    setFieldErrors((prev) => {
      const next = { ...prev }

      if (prev[field]) {
        if (nextValidation.errors[field]) next[field] = nextValidation.errors[field]
        else delete next[field]
      }

      if (field === 'password' || field === 'confirmPassword') {
        if (nextValidation.errors.confirmPassword) next.confirmPassword = nextValidation.errors.confirmPassword
        else delete next.confirmPassword
      }

      return next
    })
  }

  const handleFieldBlur = (field) => {
    const normalizedValue = (() => {
      if (field === 'name') return normalizeTextInput(form.name)
      if (field === 'phone') return normalizePhoneInput(form.phone)
      if (field === 'email') return normalizeEmailInput(form.email)
      return form[field]
    })()

    const nextForm = normalizedValue !== form[field]
      ? { ...form, [field]: normalizedValue }
      : form

    if (nextForm !== form) setForm(nextForm)

    const nextValidation = buildValidationState(nextForm)
    setFieldErrors((prev) => {
      const next = { ...prev }

      if (nextValidation.errors[field]) next[field] = nextValidation.errors[field]
      else delete next[field]

      if (field === 'password' || field === 'confirmPassword') {
        if (nextValidation.errors.confirmPassword) next.confirmPassword = nextValidation.errors.confirmPassword
        else delete next.confirmPassword
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const { normalizedForm, parsed, errors: mappedErrors } = buildValidationState(form)
    if (!parsed.success || Object.keys(mappedErrors).length > 0) {
      setFieldErrors(mappedErrors)
      setError('Vui lòng kiểm tra lại thông tin đăng ký.')
      return
    }

    if (
      normalizedForm.name !== form.name ||
      normalizedForm.phone !== form.phone ||
      normalizedForm.email !== form.email
    ) {
      setForm((prev) => ({
        ...prev,
        name: normalizedForm.name,
        phone: normalizedForm.phone,
        email: normalizedForm.email,
      }))
    }

    setSubmitting(true)

    try {
      const { name, phone, email, password } = parsed.data
      await signup({
        name,
        phone,
        email,
        password
      })
      navigate('/', { replace: true })
    } catch (apiError) {
      const message = apiError?.response?.data?.message || apiError?.message || ''
      const normalizedMessage = String(message).toLowerCase()
      if (normalizedMessage.includes('email') && (normalizedMessage.includes('exist') || normalizedMessage.includes('already') || normalizedMessage.includes('đã tồn tại') || normalizedMessage.includes('da ton tai'))) {
        setFieldErrors((prev) => ({ ...prev, email: 'Email đã tồn tại.' }))
        setError('')
      } else {
        setError(message || 'Đăng ký thất bại')
      }
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
          <h2 className="auth-title">Đăng ký để đặt thuê nhanh hơn</h2>
          <p className="auth-subtitle">Tạo tài khoản để lưu thông tin, theo dõi đơn thuê và nhận ưu đãi thành viên.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-wrap">
              <label>Họ và tên</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">U</span>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={form.name}
                  onChange={(event) => applyFieldChange('name', event.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                  className={fieldErrors.name ? 'border-rose-400 focus:border-rose-500' : ''}
                  required
                />
              </div>
              {fieldErrors.name ? <div id="signup-name-error" className="error-text" role="alert">{fieldErrors.name}</div> : null}
            </div>

            <div className="auth-input-wrap">
              <label>Số điện thoại</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">#</span>
                <input
                  id="signup-phone"
                  type="text"
                  placeholder="Nhập số điện thoại"
                  value={form.phone}
                  onChange={(event) => applyFieldChange('phone', event.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  autoComplete="tel"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? 'signup-phone-error' : undefined}
                  className={fieldErrors.phone ? 'border-rose-400 focus:border-rose-500' : ''}
                  required
                />
              </div>
              {fieldErrors.phone ? <div id="signup-phone-error" className="error-text" role="alert">{fieldErrors.phone}</div> : null}
            </div>

            <div className="auth-input-wrap">
              <label>Email</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">@</span>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={(event) => applyFieldChange('email', event.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                  className={fieldErrors.email ? 'border-rose-400 focus:border-rose-500' : ''}
                  required
                />
              </div>
              {fieldErrors.email ? <div id="signup-email-error" className="error-text" role="alert">{fieldErrors.email}</div> : null}
            </div>

            <div className="auth-input-wrap">
              <label>Mật khẩu</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">*</span>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={(event) => applyFieldChange('password', event.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
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
              {fieldErrors.password ? <div id="signup-password-error" className="error-text" role="alert">{fieldErrors.password}</div> : null}
            </div>

            <div className="auth-input-wrap">
              <label>Xác nhận mật khẩu</label>
              <div className="auth-input-icon-wrap">
                <span className="auth-input-icon" aria-hidden="true">*</span>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(event) => applyFieldChange('confirmPassword', event.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                  className={fieldErrors.confirmPassword ? 'border-rose-400 focus:border-rose-500' : ''}
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
              {fieldErrors.confirmPassword ? <div id="signup-confirm-password-error" className="error-text" role="alert">{fieldErrors.confirmPassword}</div> : null}
            </div>

            {error && <div className="error-text" role="alert">{error}</div>}

            <button type="submit" disabled={submitting || !isFormValid} className="login-submit-btn">
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
    </>
  )
}

export default SignupPage
