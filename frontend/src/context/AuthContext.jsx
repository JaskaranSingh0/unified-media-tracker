import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, authRegister, authMe, updateUserPassword, deleteUserAccount } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('umt_token');
    // Clean up invalid tokens from localStorage
    if (stored === 'null' || stored === 'undefined' || !stored) {
      localStorage.removeItem('umt_token');
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (payload) => {
    setLoading(true);
    try {
      const res = await authLogin(payload);
      if (res.token) {
        setToken(res.token);
        localStorage.setItem('umt_token', res.token);
        await fetchMe(res.token);
      }
      setLoading(false);
      return res;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await authRegister(payload);
      if (res.token) {
        setToken(res.token);
        localStorage.setItem('umt_token', res.token);
        await fetchMe(res.token);
      }
      setLoading(false);
      return res;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('umt_token');
  };

  const fetchMe = async (t = token) => {
    if (!t) return;
    try {
      console.log('AuthContext: Fetching user profile...');
      const res = await authMe(t);
      setUser(res.user);
      console.log('AuthContext: User profile loaded successfully');
    } catch (err) {
      console.error('AuthContext fetchMe failed:', err);
      console.error('fetchMe error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method
      });
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
    if (token) {
      // Validate token format before making API call
      try {
        // Check if token looks like a JWT (has 3 parts separated by dots)
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.warn('Invalid token format, clearing...');
          logout();
          return;
        }
        fetchMe(token);
      } catch (error) {
        console.error('Token validation error:', error);
        logout();
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, fetchMe, updatePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
