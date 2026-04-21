import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/common/Header';
import { useAuth } from '../../hooks/useAuth';
import { getRouteByRole, normalizeRole } from '../../utils/auth';
import { API_BASE_URL } from '../../config/env';
import '../../style/AuthPages.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)\d{9,10}$/;

const ROLE_META = {
  owner: {
    title: 'Đăng nhập quản trị chủ shop',
    subtitle: 'Dành cho Owner - quản trị toàn bộ hệ thống cửa hàng.',
    badge: 'CỔNG OWNER',
    fallbackPath: '/owner/dashboard',
  },
  staff: {
    title: 'Đăng nhập nhân sự cửa hàng',
    subtitle: 'Dành cho Staff - xử lý đơn thuê, lịch thử và vận hành tại quầy.',
    badge: 'CỔNG STAFF',
    fallbackPath: '/staff',
  },
};

const normalizeLoginError = (apiError) => {
  const message = apiError?.response?.data?.message || '';
  const normalized = String(message).toLowerCase();
  if (normalized.includes('invalid') || normalized.includes('not found') || normalized.includes('password')) {
    return 'Tài khoản hoặc mật khẩu không đúng.';
  }
  if (normalized.includes('locked')) {
    return 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.';
  }
  if (
    normalized.includes('cho owner duyet')
    || normalized.includes('chờ owner duyệt')
    || normalized.includes('pending')
    || normalized.includes('chua duoc kich hoat')
    || normalized.includes('chưa được kích hoạt')
    || normalized.includes('bam accept')
    || normalized.includes('bấm accept')
  ) {
    return 'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email mời và bấm Accept.';
  }
  return message || 'Đăng nhập thất bại.';
};

export default function RoleLoginPage({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, clearSession } = useAuth();

  const requestedRole = normalizeRole(role || searchParams.get('role') || location.state?.loginRole || 'staff');
  const activeRole = requestedRole === 'owner' ? 'owner' : 'staff';
  const meta = ROLE_META[activeRole];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const from = location.state?.from?.pathname || '';
    if (activeRole === 'owner' && from.startsWith('/owner')) return from;
    if (activeRole === 'staff' && from.startsWith('/staff')) return from;
    return meta.fallbackPath;
  }, [activeRole, location.state, meta.fallbackPath]);
  const inviteStatus = String(searchParams.get('invite') || '').trim().toLowerCase();
  const inviteMessage = useMemo(() => {
    if (inviteStatus === 'accepted') {
      return {
        tone: 'success',
        text: 'Xác nhận email thành công. Bạn có thể đăng nhập tài khoản Staff ngay bây giờ.'
      };
    }
    if (inviteStatus === 'expired') {
      return {
        tone: 'error',
        text: 'Link mời đã hết hạn. Vui lòng nhờ chủ shop gửi lại lời mời mới.'
      };
    }
    if (inviteStatus === 'invalid') {
      return {
        tone: 'error',
        text: 'Link mời không hợp lệ hoặc đã được sử dụng.'
      };
    }
    if (inviteStatus === 'error') {
      return {
        tone: 'error',
        text: 'Không thể xác nhận lời mời lúc này. Vui lòng thử lại sau.'
      };
    }
    return null;
  }, [inviteStatus]);

  const enforceRole = async (data) => {
    const userRole = normalizeRole(data?.user?.role);
    if (userRole !== activeRole) {
      clearSession();
      throw new Error(`Tài khoản này không có quyền truy cập cổng ${activeRole.toUpperCase()}.`);
    }
    return true;
  };

  const handleGoogleLogin = () => {
    console.log('🔐 [OAuth] Redirecting to Google OAuth via backend:', {
      redirectUrl: `${API_BASE_URL}/auth/google?portal=${activeRole}`,
      portal: activeRole,
      timestamp: new Date().toISOString()
    })
    window.location.href = `${API_BASE_URL}/auth/google?portal=${activeRole}`
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedIdentifier = identifier.replace(/\s+/g, '').trim();
    if (!normalizedIdentifier || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    const isEmail = emailRegex.test(normalizedIdentifier);
    const isPhone = phoneRegex.test(normalizedIdentifier);
    if (!isEmail && !isPhone) {
      setError('Vui lòng nhập đúng Email hoặc số điện thoại hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = isPhone
        ? { phone: normalizedIdentifier, password, portal: 'staff' }
        : { email: normalizedIdentifier.toLowerCase(), password, portal: 'staff' };

      const data = await login(payload, { rememberMe });
      await enforceRole(data);
      const targetPath = redirectPath || getRouteByRole(data.user.role);
      navigate(targetPath, { replace: true });
    } catch (apiError) {
      setError(normalizeLoginError(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchRole = (nextRole) => {
    setError('');
    setSearchParams({ role: nextRole });
  };

  return (
    <>
      <Header />
      <div className="auth-shell auth-page auth-with-header login-page-shell">
        <div className="auth-layout auth-layout-login">
          <section className="auth-showcase login-hero">
            <div className="login-hero-top">
              <p className="auth-showcase-badge">{meta.badge}</p>
            </div>
            <div className="login-hero-copy">
              <h1>{meta.title}</h1>
              <p className="login-hero-slogan">{meta.subtitle}</p>
            </div>
          </section>

          <section className="auth-card auth-panel login-form-card">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => handleSwitchRole('staff')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeRole === 'staff' ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole('owner')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeRole === 'owner' ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Owner
              </button>
            </div>

            <h2 className="auth-title">{meta.title}</h2>
            <p className="auth-subtitle">Vui lòng đăng nhập bằng tài khoản được phân quyền.</p>
            {activeRole === 'staff' && inviteMessage ? (
              <div className={inviteMessage.tone === 'success' ? 'success-text' : 'error-text'}>
                {inviteMessage.text}
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-wrap">
                <label>Email / SĐT</label>
                <div className="auth-input-icon-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="Email hoặc số điện thoại"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-wrap">
                <label>Mật khẩu</label>
                <div className="auth-input-icon-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    *
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Ghi nhớ tôi</span>
                </label>
                <Link to="/forgot-password" className="inline-link">
                  Quên mật khẩu?
                </Link>
              </div>

              {error && <div className="error-text">{error}</div>}

              <button type="submit" disabled={submitting} className="login-submit-btn">
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className="auth-divider">
                <span>Hoặc</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="google-login-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  hover: { backgroundColor: '#f9fafb', borderColor: '#9ca3af' }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Đăng nhập với Google
              </button>
            </form>

            <div className="auth-links auth-links-center">
              <span>Cổng khách hàng?</span>
              <Link to="/login">Đăng nhập thường</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
