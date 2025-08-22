import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        const res = await register({ email, username, password });
        if (res.token) {
          // Redirect new users to onboarding
          navigate('/onboarding');
        }
      } else {
        const res = await login({ email, password });
        if (res.token) {
          // Redirect existing users to dashboard
          navigate('/');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  return (
    <div className="auth-card">
      <h2>{isRegister ? 'Create account' : 'Login'}</h2>
      <form onSubmit={submit}>
        <label>Email</label>
        <input required value={email} onChange={e => setEmail(e.target.value)} />
        {isRegister && (
          <>
            <label>Username</label>
            <input required value={username} onChange={e => setUsername(e.target.value)} />
          </>
        )}
        <label>Password</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
      </form>
      {error && <div className="error">{error}</div>}
      <div className="muted">
        <button onClick={() => setIsRegister(!isRegister)} className="link-btn">
          {isRegister ? 'Have an account? Login' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}
