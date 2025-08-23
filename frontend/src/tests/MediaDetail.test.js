import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MediaDetail from '../pages/MediaDetail';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../utils/api';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockParams = { type: 'movie', id: '123' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Mock the API functions
jest.mock('../utils/api');

const mockUser = {
  _id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

const mockMediaDetails = {
  id: 123,
  title: 'Test Movie',
  overview: 'A great test movie',
  poster_path: '/test-poster.jpg',
  genres: [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Adventure' }
  ],
  release_date: '2023-01-01',
  runtime: 120,
  vote_average: 7.5
};

const mockUserItem = {
  _id: 'user-item-1',
  apiId: 123,
  mediaType: 'movie',
  status: 'completed',
  rating: 8,
  selfNote: 'Great movie!',
  title: 'Test Movie'
};

const MockAuthProvider = ({ children }) => (
  <AuthContext.Provider value={{
    token: 'mock-token',
    user: mockUser,
    fetchMe: jest.fn()
  }}>
    {children}
  </AuthContext.Provider>
);

const renderMediaDetail = () => {
  return render(
    <BrowserRouter>
      <MockAuthProvider>
        <MediaDetail />
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('MediaDetail', () => {
  beforeEach(() => {
    api.getMediaDetails.mockResolvedValue(mockMediaDetails);
    api.getUserItemByApiId.mockResolvedValue(mockUserItem);
    api.addListItem.mockResolvedValue({ item: mockUserItem });
    api.updateListItem.mockResolvedValue({ item: mockUserItem });
    api.deleteListItem.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders media details correctly', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.getByText('A great test movie')).toBeInTheDocument();
      expect(screen.getByText('Action, Adventure')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    renderMediaDetail();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows add to list form when item not in user list', async () => {
    api.getUserItemByApiId.mockResolvedValue(null);
    
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/add to list/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('planToWatch')).toBeInTheDocument();
    });
  });

  test('shows edit form when item is in user list', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/edit/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('completed')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Great movie!')).toBeInTheDocument();
    });
  });

  test('handles adding item to list', async () => {
    api.getUserItemByApiId.mockResolvedValue(null);
    
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/add to list/i)).toBeInTheDocument();
    });

    // Change status to completed
    const statusSelect = screen.getByDisplayValue('planToWatch');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // Add rating
    const ratingInput = screen.getByLabelText(/rating/i);
    fireEvent.change(ratingInput, { target: { value: '9' } });

    // Add note
    const noteTextarea = screen.getByLabelText(/note/i);
    fireEvent.change(noteTextarea, { target: { value: 'Amazing movie!' } });

    // Submit form
    const addButton = screen.getByText(/add to list/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(api.addListItem).toHaveBeenCalledWith('mock-token', {
        apiId: 123,
        mediaType: 'movie',
        status: 'completed',
        rating: 9,
        selfNote: 'Amazing movie!'
      });
    });
  });

  test('handles updating existing item', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByDisplayValue('8')).toBeInTheDocument();
    });

    // Update rating
    const ratingInput = screen.getByDisplayValue('8');
    fireEvent.change(ratingInput, { target: { value: '9' } });

    // Update note
    const noteTextarea = screen.getByDisplayValue('Great movie!');
    fireEvent.change(noteTextarea, { target: { value: 'Updated note!' } });

    // Submit form
    const updateButton = screen.getByText(/update/i);
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateListItem).toHaveBeenCalledWith('mock-token', 'user-item-1', {
        status: 'completed',
        rating: 9,
        selfNote: 'Updated note!'
      });
    });
  });

  test('handles removing item from list', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/remove from list/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByText(/remove from list/i);
    fireEvent.click(removeButton);

    // Should show confirmation
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByText(/confirm|yes/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.deleteListItem).toHaveBeenCalledWith('mock-token', 'user-item-1');
    });
  });

  test('handles season tracking for TV shows', async () => {
    // Update mock params for TV show
    mockParams.type = 'tv';
    mockParams.id = '456';

    const mockTVDetails = {
      ...mockMediaDetails,
      id: 456,
      name: 'Test TV Show',
      number_of_seasons: 3,
      first_air_date: '2023-01-01'
    };

    const mockTVUserItem = {
      ...mockUserItem,
      apiId: 456,
      mediaType: 'tv',
      status: 'watching',
      watchedSeasons: [1, 2]
    };

    api.getMediaDetails.mockResolvedValue(mockTVDetails);
    api.getUserItemByApiId.mockResolvedValue(mockTVUserItem);

    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText('Test TV Show')).toBeInTheDocument();
      expect(screen.getByText(/season progress/i)).toBeInTheDocument();
    });

    // Should show season checkboxes or buttons
    const season1 = screen.getByText('1');
    const season2 = screen.getByText('2');
    const season3 = screen.getByText('3');

    expect(season1).toBeInTheDocument();
    expect(season2).toBeInTheDocument();
    expect(season3).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    api.getMediaDetails.mockRejectedValue(new Error('API Error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/error loading media details/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  test('validates rating input', async () => {
    api.getUserItemByApiId.mockResolvedValue(null);
    
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText(/add to list/i)).toBeInTheDocument();
    });

    const ratingInput = screen.getByLabelText(/rating/i);
    
    // Test invalid rating (too high)
    fireEvent.change(ratingInput, { target: { value: '11' } });
    fireEvent.blur(ratingInput);

    expect(screen.getByText(/rating must be between 1 and 10/i)).toBeInTheDocument();

    // Test invalid rating (too low)
    fireEvent.change(ratingInput, { target: { value: '0' } });
    fireEvent.blur(ratingInput);

    expect(screen.getByText(/rating must be between 1 and 10/i)).toBeInTheDocument();
  });

  test('shows different fields based on status selection', async () => {
    api.getUserItemByApiId.mockResolvedValue(null);
    
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByDisplayValue('planToWatch')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('planToWatch');

    // Rating should not be visible for planToWatch
    expect(screen.queryByLabelText(/rating/i)).not.toBeInTheDocument();

    // Change to completed
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // Rating should now be visible
    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
  });

  test('navigates back when back button is clicked', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    const backButton = screen.getByText(/back/i);
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('displays correct media type badge', async () => {
    renderMediaDetail();

    await waitFor(() => {
      expect(screen.getByText('Movie')).toBeInTheDocument();
    });
  });

  test('handles missing poster image', async () => {
    const mockDetailsNoPoster = {
      ...mockMediaDetails,
      poster_path: null
    };

    api.getMediaDetails.mockResolvedValue(mockDetailsNoPoster);

    renderMediaDetail();

    await waitFor(() => {
      const posterImg = screen.getByAltText('Test Movie');
      expect(posterImg).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });
  });
});
