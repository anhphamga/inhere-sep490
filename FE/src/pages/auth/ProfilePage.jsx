import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePasswordApi, getProfileApi, updateProfileApi, uploadAvatarApi } from '../../services/auth.service'
import { useAuth } from '../../store/AuthContext'
import MainHeader from '../../components/layout/MainHeader'
import '../../style/AuthPages.css'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
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
        setError(apiError?.response?.data?.message || 'Không thể tải profile')
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
      setSuccess('Cập nhật profile thành công')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Cập nhật profile thất bại')
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

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

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
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

    if (selectedFile.size > 2 * 1024 * 1024) {
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
      setError('Vui lòng chọn ảnh trước khi upload')
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
      setSuccess('Upload ảnh đại diện thành công')
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.response?.data?.error || 'Upload ảnh thất bại')
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <>
      <MainHeader />
      <div className="auth-shell profile-shell">
        <div className="profile-layout-card">
          <aside className="profile-sidebar">
            <div className="profile-user-block">
              <div className="profile-user-avatar">
                {avatarPreviewUrl ? <img src={avatarPreviewUrl} alt="Avatar" className="profile-user-avatar-img" /> : '👤'}
              </div>
              <div>
                <p className="profile-user-name">{profileForm.name || 'User'}</p>
                <p className="profile-user-role">Role: {user?.role}</p>
              </div>
            </div>

            <div className="profile-menu">
              <button
                type="button"
                className={`profile-menu-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Hồ sơ
              </button>
              <button
                type="button"
                className={`profile-menu-item ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                Đổi mật khẩu
              </button>
              <button
                type="button"
                className={`profile-menu-item ${activeTab === 'avatar' ? 'active' : ''}`}
                onClick={() => setActiveTab('avatar')}
              >
                Ảnh đại diện
              </button>
            </div>
          </aside>

          <section className="profile-main">
            <h1 className="auth-title">Hồ Sơ Của Tôi</h1>
            <p className="auth-subtitle">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>

            {activeTab === 'profile' && (
              <div className="profile-panel">
                <h2>Thông tin cá nhân</h2>
                <form className="profile-form" onSubmit={handleProfileUpdate}>
                  <div className="profile-form-row">
                    <label>Họ và tên</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Số điện thoại</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Địa chỉ</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })}
                      placeholder="Nhập địa chỉ nhận hàng"
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Giới tính</label>
                    <select
                      value={profileForm.gender}
                      onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })}
                    >
                      <option value="">Chưa chọn</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div className="profile-form-row">
                    <label>Ngày sinh</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(event) => setProfileForm({ ...profileForm, dateOfBirth: event.target.value })}
                    />
                  </div>

                  <button type="submit" className="auth-action-btn">Lưu</button>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="profile-panel">
                <h2>Đổi mật khẩu</h2>
                <form className="profile-form" onSubmit={handleChangePassword}>
                  <div className="profile-form-row">
                    <label>Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      minLength={6}
                      onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-row">
                    <label>Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.confirmNewPassword}
                      minLength={6}
                      onChange={(event) => setPasswordForm({ ...passwordForm, confirmNewPassword: event.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="auth-action-btn">Đổi mật khẩu</button>
                </form>
              </div>
            )}

            {activeTab === 'avatar' && (
              <div className="profile-panel">
                <h2>Ảnh đại diện</h2>
                <div className="avatar-upload-placeholder">
                  <div className="avatar-preview-circle">
                    {avatarPreviewUrl ? <img src={avatarPreviewUrl} alt="Avatar preview" className="avatar-preview-img" /> : '👤'}
                  </div>
                  <label className="auth-secondary-btn" htmlFor="avatar-file-input">
                    Chọn ảnh
                  </label>
                  <input
                    id="avatar-file-input"
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
                    {avatarUploading ? 'Đang upload...' : 'Upload ảnh'}
                  </button>
                  <p className="avatar-upload-hint">Định dạng hỗ trợ: JPG, PNG, WEBP. Dung lượng tối đa 2MB.</p>
                </div>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}

            <div className="row-actions">
              <Link className="auth-secondary-btn" to="/">
                Về trang chủ
              </Link>
              <button className="auth-action-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default ProfilePage
