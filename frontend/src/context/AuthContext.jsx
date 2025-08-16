import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, authRegister, authMe, updateUserPassword, deleteUserAccount } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('umt_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (payload) => {
    setLoading(true);
    const res = await authLogin(payload);
    if (res.token) {
      setToken(res.token);
      localStorage.setItem('umt_token', res.token);
      await fetchMe(res.token);
    }
    setLoading(false);
    return res;
  };

  const register = async (payload) => {
    setLoading(true);
    const res = await authRegister(payload);
    if (res.token) {
      setToken(res.token);
      localStorage.setItem('umt_token', res.token);
      await fetchMe(res.token);
    }
    setLoading(false);
    return res;
  };

  const fetchMe = async (t = token) => {
    if (!t) return;
    try {
      const res = await authMe(t);
      setUser(res.user);
    } catch (err) {
      console.error('fetchMe failed', err);
      logout();
    }
  };
  
  const updatePassword = async (currentPassword, newPassword) => {
    if (!token) throw new Error('Not authenticated');
    try {
      await updateUserPassword(token, { currentPassword, newPassword });
    } catch (error) {
      console.error('Password update failed', error);
      throw new Error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const deleteAccount = async () => {
    if (!token) throw new Error('Not authenticated');
    try {
      await deleteUserAccount(token);
      logout();
    } catch (error) {
      console.error('Account deletion failed', error);
      throw new Error(error.response?.data?.error || 'Failed to delete account');
    }
  };

  useEffect(() => {
    if (token) fetchMe(token);
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('umt_token');
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, fetchMe, updatePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
