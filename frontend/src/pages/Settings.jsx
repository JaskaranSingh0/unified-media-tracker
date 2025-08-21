import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserPassword, deleteUserAccount } from '../utils/api';

export default function Settings() {
  const { user, token, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    try {
      await updateUserPassword(token, { currentPassword, newPassword });
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
      setSuccess('');
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }
    
    try {
      await deleteUserAccount(token);
      logout(); // Log the user out after account deletion
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  return (
    <div className="settings-container">
      <h1>Account Settings</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-card">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange} className="settings-form">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength="8"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="8"
            />
          </div>
          <button type="submit" className="primary-btn">
            Update Password
          </button>
        </form>
      </div>
      
      <div className="settings-card danger-zone">
        <h2>Danger Zone</h2>
        <p>Deleting your account will permanently remove all your tracked media and account information. This action cannot be undone.</p>
        
        {!showDeleteConfirm ? (
          <button 
            className="danger-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <div className="delete-confirmation">
            <p>Type <strong>DELETE</strong> to confirm:</p>
            <input 
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <div className="action-buttons">
              <button 
                className="danger-btn"
                onClick={handleAccountDeletion}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Permanently Delete Account
              </button>
              <button 
                className="secondary-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
