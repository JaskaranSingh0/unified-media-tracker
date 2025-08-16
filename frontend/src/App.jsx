import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import MediaDetail from './pages/MediaDetail';
import Settings from './pages/Settings';
import UserLists from './pages/UserLists';
import Header from './components/Header';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { token } = useAuth();

  return (
    <div className="app-root">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/search" element={token ? <Search /> : <Navigate to="/login" />} />
          <Route path="/lists" element={token ? <UserLists /> : <Navigate to="/login" />} />
          <Route path="/media/:type/:id" element={token ? <MediaDetail /> : <Navigate to="/login" />} />
          <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}
