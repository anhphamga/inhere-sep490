import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import '../style/MainHeader.css'

const MainHeader = () => {
  const { isAuthenticated, logout, user } = useAuth()
  const isStaff = user?.role === 'staff'
  const isOwner = user?.role === 'owner'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

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
              <div className="profile-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="profile-icon-btn"
                  aria-label="Mở menu tài khoản"
                  title="Tài khoản"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="header-avatar-img" />
                  ) : (
                    '👤'
                  )}
                </button>

                {menuOpen && (
                  <div className="profile-dropdown">
                    {(isOwner || isStaff) && (
                      <Link
                        to={isOwner ? '/owner' : '/staff'}
                        className="profile-dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}

                    <Link
                      to="/profile"
                      className="profile-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Xem thông tin
                    </Link>

                    <button
                      type="button"
                      className="profile-dropdown-item profile-dropdown-danger"
                      onClick={async () => {
                        setMenuOpen(false)
                        await logout()
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
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
