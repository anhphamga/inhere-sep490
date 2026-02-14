import { Link } from 'react-router-dom'
import './AuthPages.css'

const OwnerPage = () => {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Owner Page</h1>
        <p className="auth-subtitle">Trang rỗng cho owner. Team có thể phát triển thêm ở đây.</p>
        <div className="row-actions">
          <Link className="auth-action-btn" to="/profile">
            Profile
          </Link>
          <Link className="auth-secondary-btn" to="/">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OwnerPage
