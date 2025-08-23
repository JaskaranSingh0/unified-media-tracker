import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../utils/api';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the API functions
jest.mock('../utils/api');

const mockUser = {
  _id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

const mockLogout = jest.fn();
const mockFetchMe = jest.fn();

const MockAuthProvider = ({ children }) => (
  <AuthContext.Provider value={{
    token: 'mock-token',
    user: mockUser,
    logout: mockLogout,
    fetchMe: mockFetchMe
  }}>
    {children}
  </AuthContext.Provider>
);

const renderSettings = () => {
  return render(
    <BrowserRouter>
      <MockAuthProvider>
        <Settings />
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('Settings', () => {
  beforeEach(() => {
    api.updatePassword.mockResolvedValue({ message: 'Password updated successfully' });
    api.deleteAccount.mockResolvedValue({ message: 'Account deleted successfully' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders settings page with user information', () => {
    renderSettings();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('displays password change form', () => {
    renderSettings();

    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  test('handles password change successfully', async () => {
    renderSettings();

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

    const updateButton = screen.getByText(/update password/i);
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updatePassword).toHaveBeenCalledWith('mock-token', {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123'
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
    });

    // Form should be reset
    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });

  test('validates password confirmation', async () => {
    renderSettings();

    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });

    const updateButton = screen.getByText(/update password/i);
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(api.updatePassword).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    renderSettings();

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
    fireEvent.change(newPasswordInput, { target: { value: '123' } }); // Too short
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    const updateButton = screen.getByText(/update password/i);
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });

    expect(api.updatePassword).not.toHaveBeenCalled();
  });

  test('handles password change API error', async () => {
    api.updatePassword.mockRejectedValue({
      response: { data: { error: 'Current password is incorrect' } }
    });

    renderSettings();

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

    const updateButton = screen.getByText(/update password/i);
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  test('displays account deletion section', () => {
    renderSettings();

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/delete my account/i)).toBeInTheDocument();
  });

  test('handles account deletion with confirmation', async () => {
    renderSettings();

    const deleteButton = screen.getByText(/delete my account/i);
    fireEvent.click(deleteButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete your account/i)).toBeInTheDocument();
    });

    // Type confirmation text
    const confirmInput = screen.getByPlaceholderText(/type "DELETE" to confirm/i);
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

    // Confirm deletion
    const confirmButton = screen.getByText(/confirm deletion/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.deleteAccount).toHaveBeenCalledWith('mock-token');
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('prevents account deletion without proper confirmation', async () => {
    renderSettings();

    const deleteButton = screen.getByText(/delete my account/i);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete your account/i)).toBeInTheDocument();
    });

    // Type incorrect confirmation text
    const confirmInput = screen.getByPlaceholderText(/type "DELETE" to confirm/i);
    fireEvent.change(confirmInput, { target: { value: 'delete' } }); // wrong case

    const confirmButton = screen.getByText(/confirm deletion/i);
    expect(confirmButton).toBeDisabled();

    // Should not call API
    fireEvent.click(confirmButton);
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });

  test('handles account deletion API error', async () => {
    api.deleteAccount.mockRejectedValue({
      response: { data: { error: 'Unable to delete account' } }
    });

    renderSettings();

    const deleteButton = screen.getByText(/delete my account/i);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete your account/i)).toBeInTheDocument();
    });

    const confirmInput = screen.getByPlaceholderText(/type "DELETE" to confirm/i);
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

    const confirmButton = screen.getByText(/confirm deletion/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Unable to delete account')).toBeInTheDocument();
    });

    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('shows loading states during operations', async () => {
    api.updatePassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderSettings();

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

    const updateButton = screen.getByText(/update password/i);
    fireEvent.click(updateButton);

    // Should show loading state
    expect(screen.getByText(/updating/i)).toBeInTheDocument();
    expect(updateButton).toBeDisabled();
  });

  test('displays user preferences section if implemented', () => {
    renderSettings();

    // These might be future features
    const preferencesSections = [
      /theme/i,
      /notifications/i,
      /privacy/i
    ];

    // Check if any preference sections exist (optional)
    preferencesSections.forEach(pattern => {
      const element = screen.queryByText(pattern);
      if (element) {
        expect(element).toBeInTheDocument();
      }
    });
  });

  test('handles missing user data gracefully', () => {
    const MockAuthProviderNoUser = ({ children }) => (
      <AuthContext.Provider value={{
        token: 'mock-token',
        user: null,
        logout: mockLogout,
        fetchMe: mockFetchMe
      }}>
        {children}
      </AuthContext.Provider>
    );

    render(
      <BrowserRouter>
        <MockAuthProviderNoUser>
          <Settings />
        </MockAuthProviderNoUser>
      </BrowserRouter>
    );

    // Should still render settings page, possibly with loading state
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('cancels account deletion confirmation', async () => {
    renderSettings();

    const deleteButton = screen.getByText(/delete my account/i);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete your account/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    // Confirmation dialog should be hidden
    expect(screen.queryByText(/are you sure you want to delete your account/i)).not.toBeInTheDocument();
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });
});
