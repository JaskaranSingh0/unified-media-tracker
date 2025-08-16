import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { token, user, logout } = useAuth();
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
        </nav>
      </div>
    </header>
  );
}
