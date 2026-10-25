import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-green-800 border-b-2 border-green-800'
        : 'text-gray-700 hover:text-green-800'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#fdf6ec] border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-green-800">
              CampusIntern
            </Link>
            <span className="hidden sm:inline-block text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
              On-Campus Portal
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/" className={linkClass('/')}>
              Home
            </Link>
            <Link to="/internships" className={linkClass('/internships')}>
              Internships
            </Link>
            <Link to="/apply" className={linkClass('/apply')}>
              Apply Now
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 text-xs font-semibold rounded ${
                  isActive('/admin')
                    ? 'bg-green-800 text-white'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                Admin Panel
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-300">
                <span className="text-xs text-gray-700 font-medium">
                  {user.role === 'admin' ? 'Admin' : user.rollNumber || user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-3.5 py-1.5 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-green-800"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gray-200 pt-3">
            <Link
              to="/"
              className={`block ${linkClass('/')}`}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/internships"
              className={`block ${linkClass('/internships')}`}
              onClick={() => setMobileOpen(false)}
            >
              Internships
            </Link>
            <Link
              to="/apply"
              className={`block ${linkClass('/apply')}`}
              onClick={() => setMobileOpen(false)}
            >
              Apply Now
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="block px-3 py-2 text-sm font-semibold text-green-800 bg-green-50 rounded"
                onClick={() => setMobileOpen(false)}
              >
                Admin Panel
              </Link>
            )}

            {user ? (
              <div className="pt-2 flex items-center justify-between px-3">
                <span className="text-xs text-gray-600">
                  Logged in as <strong className="text-gray-900">{user.name}</strong>
                </span>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block px-3 py-2 text-center text-sm font-medium text-white bg-green-800 rounded hover:bg-green-900"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
