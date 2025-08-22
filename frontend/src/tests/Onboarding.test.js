import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Onboarding from '../pages/Onboarding';
import * as api from '../utils/api';

// Mock the API
jest.mock('../utils/api');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Onboarding', () => {
  const mockUser = { id: '1', username: 'testuser' };
  const mockToken = 'mock-token';

  const MockAuthProvider = ({ children }) => (
    <AuthContext.Provider value={{ user: mockUser, token: mockToken }}>
      {children}
    </AuthContext.Provider>
  );

  const renderOnboarding = () => {
    return render(
      <BrowserRouter>
        <MockAuthProvider>
          <Onboarding />
        </MockAuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    api.discoverTrending.mockImplementation((type) => {
      const mockData = {
        movie: [
          { apiId: '1', mediaType: 'movie', title: 'Test Movie', poster: 'test-poster.jpg', releaseDate: '2023-01-01' }
        ],
        tv: [
          { apiId: '2', mediaType: 'tv', title: 'Test TV Show', poster: 'test-tv-poster.jpg', releaseDate: '2023-02-01' }
        ],
        anime: [
          { apiId: '3', mediaType: 'anime', title: 'Test Anime', poster: 'test-anime-poster.jpg', releaseDate: '2023-03-01' }
        ]
      };
      return Promise.resolve(mockData[type] || []);
    });
    api.addListItem.mockResolvedValue({ success: true });
  });

  test('renders welcome message with username', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Unified Media Tracker, testuser!/)).toBeInTheDocument();
    });
  });

  test('loads and displays popular content', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText('Popular Movies')).toBeInTheDocument();
      expect(screen.getByText('Popular TV Shows')).toBeInTheDocument();
      expect(screen.getByText('Popular Anime')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test TV Show')).toBeInTheDocument();
    expect(screen.getByText('Test Anime')).toBeInTheDocument();
  });

  test('handles quick add to plan to watch', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    const planButtons = screen.getAllByText('Plan to Watch');
    fireEvent.click(planButtons[0]);

    await waitFor(() => {
      expect(api.addListItem).toHaveBeenCalledWith(mockToken, {
        apiId: '1',
        mediaType: 'movie',
        status: 'planToWatch'
      });
    });
  });

  test('handles quick add to completed', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    const completedButtons = screen.getAllByText('Completed');
    fireEvent.click(completedButtons[0]);

    await waitFor(() => {
      expect(api.addListItem).toHaveBeenCalledWith(mockToken, {
        apiId: '1',
        mediaType: 'movie',
        status: 'completed'
      });
    });
  });

  test('shows added indicator after successful add', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    const planButtons = screen.getAllByText('Plan to Watch');
    fireEvent.click(planButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('✓ Added')).toBeInTheDocument();
    });
  });

  test('navigates to dashboard when skip is clicked', async () => {
    renderOnboarding();
    
    await waitFor(() => {
      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip for now'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('shows loading state initially', () => {
    renderOnboarding();
    expect(screen.getByText('Loading popular content...')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    api.discoverTrending.mockRejectedValue(new Error('API Error'));
    
    renderOnboarding();
    
    await waitFor(() => {
      // Should still render the component without crashing
      expect(screen.getByText(/Welcome to Unified Media Tracker, testuser!/)).toBeInTheDocument();
    });
  });
});
