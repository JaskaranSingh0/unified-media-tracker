import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import MediaCard from '../components/MediaCard';

const MockedMediaCard = ({ children, ...props }) => {
  return (
    <BrowserRouter>
      <MediaCard {...props} />
    </BrowserRouter>
  );
};

describe('MediaCard Component', () => {
  const mockItem = {
    _id: '123',
    apiId: 456,
    title: 'Test Movie',
    mediaType: 'movie',
    poster: 'https://example.com/poster.jpg',
    releaseDate: '2023-01-01',
    status: 'completed',
    rating: 8,
    watchedSeasons: []
  };
  
  const mockOnSeasonToggle = jest.fn();
  
  beforeEach(() => {
    mockOnSeasonToggle.mockClear();
  });
  
  test('renders movie item correctly', () => {
    render(<MockedMediaCard item={mockItem} showProgress={false} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });
  
  test('shows progress when enabled for TV show', () => {
    const tvItem = {
      ...mockItem,
      mediaType: 'tv',
      status: 'watching',
      watchedSeasons: [1, 2]
    };
    
    render(<MockedMediaCard item={tvItem} showProgress={true} onSeasonToggle={mockOnSeasonToggle} />);
    
    expect(screen.getByText(/Watching \(2 seasons\)/)).toBeInTheDocument();
    expect(screen.getByText(/★ 8\/10/)).toBeInTheDocument();
  });
  
  test('shows completed status correctly', () => {
    const completedItem = {
      ...mockItem,
      status: 'completed',
      rating: 9
    };
    
    render(<MockedMediaCard item={completedItem} showProgress={true} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText(/★ 9\/10/)).toBeInTheDocument();
  });
  
  test('renders placeholder when no poster available', () => {
    const itemWithoutPoster = {
      ...mockItem,
      poster: null
    };
    
    render(<MockedMediaCard item={itemWithoutPoster} />);
    
    expect(screen.getByText('No image')).toBeInTheDocument();
  });
  
  test('displays season tracker for TV shows when enabled', () => {
    const tvItem = {
      ...mockItem,
      mediaType: 'tv',
      watchedSeasons: [1, 3]
    };
    
    render(<MockedMediaCard item={tvItem} showProgress={true} onSeasonToggle={mockOnSeasonToggle} />);
    
    // Should show season buttons
    expect(screen.getByText('Seasons:')).toBeInTheDocument();
  });
  
  test('calls onSeasonToggle when season button clicked', () => {
    const tvItem = {
      ...mockItem,
      mediaType: 'tv',
      watchedSeasons: [1]
    };
    
    render(<MockedMediaCard item={tvItem} showProgress={true} onSeasonToggle={mockOnSeasonToggle} />);
    
    // Find and click a season button
    const seasonButton = screen.getByText('2');
    fireEvent.click(seasonButton);
    
    expect(mockOnSeasonToggle).toHaveBeenCalledWith('123', 2);
  });
  
  test('does not show season tracker for movies', () => {
    render(<MockedMediaCard item={mockItem} showProgress={true} onSeasonToggle={mockOnSeasonToggle} />);
    
    expect(screen.queryByText('Seasons:')).not.toBeInTheDocument();
  });
});
