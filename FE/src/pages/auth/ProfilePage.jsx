import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePasswordApi, getProfileApi, updateProfileApi, uploadAvatarApi } from '../../services/auth.service'
import { useAuth } from '../../hooks/useAuth'
import { getRouteByRole } from '../../utils/auth'
import MainHeader from '../../layouts/MainHeader'
import '../../style/AuthPages.css'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout, refreshMe } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: '',
    dateOfBirth: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roleLabel = useMemo(() => {
    if (user?.role === 'owner') return 'Chủ cửa hàng'
    if (user?.role === 'staff') return 'Nhân viên'
    return 'Khách hàng'
  }, [user?.role])

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true)
      try {
        const response = await getProfileApi()
        const data = response.data

        setProfileForm({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          gender: data.gender || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().slice(0, 10) : ''
        })

        setAvatarPreviewUrl(data.avatarUrl || '')
      } catch (apiError) {
        setError(apiError?.response?.data?.message || 'Không thể tải thông tin tài khoản')
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleProfileUpdate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await updateProfileApi({
        name: profileForm.name,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        gender: profileForm.gender || null,
        dateOfBirth: profileForm.dateOfBirth || null
      })

      await refreshMe()
      setSuccess('Đã cập nhật thông tin cá nhân')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Cập nhật thông tin thất bại')
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (passwordForm.newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('Xác nhận mật khẩu mới không khớp')
      return
    }

    try {
      await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setSuccess('Đổi mật khẩu thành công')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Đổi mật khẩu thất bại')
    }
  }

  const handleAvatarFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ')
      return
    }

    if (selectedFile.size > MAX_AVATAR_SIZE) {
      setError('Kích thước ảnh tối đa 2MB')
      return
    }

    setError('')
    setSuccess('')
    setAvatarFile(selectedFile)
    setAvatarPreviewUrl(URL.createObjectURL(selectedFile))
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setError('Vui lòng chọn ảnh trước khi tải lên')
      return
    }

    setAvatarUploading(true)
    setError('')
    setSuccess('')

    try {
      const response = await uploadAvatarApi(avatarFile)
      setAvatarPreviewUrl(response.data.avatarUrl || avatarPreviewUrl)
      setAvatarFile(null)
      await refreshMe()
      setSuccess('Đã cập nhật ảnh đại diện')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.response?.data?.error || 'Upload ảnh thất bại')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <MainHeader />

      <div className="auth-shell profile-view-shell">
        <div className="profile-view-layout">
          <aside className="profile-overview-card">
            <div className="profile-overview-top">
              <div className="profile-overview-avatar">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="Avatar" className="profile-overview-avatar-img" />
                ) : (
                  '👤'
                )}
              </div>
              <h2>{profileForm.name || user?.name || 'Khách hàng'}</h2>
              <p>{roleLabel}</p>
            </div>

            <div className="profile-tab-list">
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Thông tin cá nhân
              </button>
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                Đổi mật khẩu
              </button>
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'avatar' ? 'active' : ''}`}
                onClick={() => setActiveTab('avatar')}
              >
                Ảnh đại diện
              </button>
            </div>

            <div className="profile-overview-actions">
              <Link className="auth-secondary-btn" to={getRouteByRole(user?.role)}>
                Về trang chính
              </Link>
              <button className="danger-btn" type="button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </aside>

          <section className="profile-content-card">
            {profileLoading ? (
              <p className="auth-subtitle">Đang tải thông tin...</p>
            ) : (
              <>
                <div className="profile-content-header">
                  <h1>{activeTab === 'profile' ? 'Thông tin tài khoản' : activeTab === 'password' ? 'Bảo mật tài khoản' : 'Ảnh đại diện'}</h1>
                  <p>{activeTab === 'profile' ? 'Cập nhật thông tin liên hệ để nhận hỗ trợ nhanh hơn từ INHERE.' : activeTab === 'password' ? 'Đổi mật khẩu định kỳ để bảo mật tài khoản của bạn.' : 'Tải ảnh rõ mặt để nhân viên hỗ trợ nhận diện nhanh khi nhận đồ.'}</p>
                </div>

                {activeTab === 'profile' && (
                  <form className="profile-modern-form" onSubmit={handleProfileUpdate}>
                    <label>
                      Họ và tên
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                        required
                      />
                    </label>

                    <label>
                      Số điện thoại
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                        required
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                        required
                      />
                    </label>

                    <label>
                      Địa chỉ
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })}
                        placeholder="Nhập địa chỉ của bạn"
                      />
                    </label>

                    <label>
                      Giới tính
                      <select
                        value={profileForm.gender}
                        onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })}
                      >
                        <option value="">Chưa chọn</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </label>

                    <label>
                      Ngày sinh
                      <input
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(event) => setProfileForm({ ...profileForm, dateOfBirth: event.target.value })}
                      />
                    </label>

                    <button type="submit" className="auth-action-btn">Lưu thay đổi</button>
                  </form>
                )}

                {activeTab === 'password' && (
                  <form className="profile-modern-form" onSubmit={handleChangePassword}>
                    <label>
                      Mật khẩu hiện tại
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                        required
                      />
                    </label>

                    <label>
                      Mật khẩu mới
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                        minLength={6}
                        required
                      />
                    </label>

                    <label>
                      Xác nhận mật khẩu mới
                      <input
                        type="password"
                        value={passwordForm.confirmNewPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, confirmNewPassword: event.target.value })}
                        minLength={6}
                        required
                      />
                    </label>

                    <button type="submit" className="auth-action-btn">Cập nhật mật khẩu</button>
                  </form>
                )}

                {activeTab === 'avatar' && (
                  <div className="profile-avatar-panel">
                    <div className="profile-avatar-preview-lg">
                      {avatarPreviewUrl ? (
                        <img src={avatarPreviewUrl} alt="Avatar preview" className="profile-overview-avatar-img" />
                      ) : (
                        '👤'
                      )}
                    </div>

                    <div className="profile-avatar-upload-actions">
                      <label className="auth-secondary-btn" htmlFor="avatar-upload-input">
                        Chọn ảnh
                      </label>
                      <input
                        id="avatar-upload-input"
                        type="file"
                        accept="image/*"
                        className="avatar-file-input"
                        onChange={handleAvatarFileChange}
                      />

                      <button
                        type="button"
                        className="auth-action-btn"
                        onClick={handleAvatarUpload}
                        disabled={avatarUploading}
                      >
                        {avatarUploading ? 'Đang tải ảnh...' : 'Lưu ảnh đại diện'}
                      </button>
                    </div>

                    <p className="auth-foot-note">Hỗ trợ JPG, PNG, WEBP. Dung lượng tối đa 2MB.</p>
                  </div>
                )}

                {error && <p className="error-text">{error}</p>}
                {success && <p className="success-text">{success}</p>}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

export default ProfilePage
