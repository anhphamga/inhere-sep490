import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import './MainHeader.css'

const MainHeader = () => {
  const { isAuthenticated, logout, user } = useAuth()

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <h1 className="logo">
            <Link to="/" className="logo-link">INHERE HOI AN OUTFIT</Link>
          </h1>
          <nav className="nav">
            <a href="#rental">Rental</a>
            <a href="#buy">Buy</a>
            <a href="#booking">Booking</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="profile-icon-btn" aria-label="Go to profile" title="Profile">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="header-avatar-img" />
                  ) : (
                    '👤'
                  )}
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    await logout()
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary">Login</Link>
            )}
            <button className="btn-primary">BOOK NOW</button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default MainHeader
