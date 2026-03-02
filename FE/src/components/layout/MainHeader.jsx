import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import '../../style/MainHeader.css'

const MainHeader = () => {
  const { isAuthenticated, logout, user } = useAuth()
  const isStaff = user?.role === 'staff'
  const isOwner = user?.role === 'owner'

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <h1 className="logo">
            <Link
              to={isOwner ? '/owner' : isStaff ? '/staff' : '/'}
              className="logo-link"
            >
              INHERE HOI AN OUTFIT
            </Link>
          </h1>
          <nav className="nav">
            {isOwner || isStaff ? (
              <>
                <Link to={isOwner ? '/owner' : '/staff'}>Dashboard</Link>
                <Link to="/profile">Profile</Link>
              </>
            ) : (
              <>
                <a href="#rental">Rental</a>
                <a href="#buy">Buy</a>
                <a href="#booking">Booking</a>
                <a href="#blog">Blog</a>
                <a href="#contact">Contact</a>
              </>
            )}
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
            {!(isOwner || isStaff) && <button className="btn-primary">BOOK NOW</button>}
          </div>
        </div>
      </div>
    </header>
  )
}

export default MainHeader
