import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

export default function Header() {
  const { token, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Use the theme context

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">Unified Media Tracker</Link>
        <nav>
          {token ? (
            <>
              <Link to="/search" className="nav-link">Search</Link>
              <Link to="/lists" className="nav-link">My Lists</Link>
              <Link to="/settings" className="nav-link">Settings</Link>
              <button onClick={logout} className="btn-ghost">Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-link">Login</Link>
          )}
          <button onClick={toggleTheme} className="btn-ghost theme-toggle-btn">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </nav>
      </div>
    </header>
  );
}
