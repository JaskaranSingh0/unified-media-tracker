import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListFilters from '../components/ListFilters';

describe('ListFilters Component', () => {
  const mockOnFiltersChange = jest.fn();
  const defaultFilters = {};
  
  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });
  
  test('renders all filter controls', () => {
    render(<ListFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByLabelText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Order:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Min Rating:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Max Rating:/i)).toBeInTheDocument();
  });
  
  test('calls onFiltersChange when status filter changes', () => {
    render(<ListFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);
    
    fireEvent.change(screen.getByLabelText(/Status:/i), { target: { value: 'watching' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      status: 'watching'
    });
  });
  
  test('calls onFiltersChange when sort filter changes', () => {
    render(<ListFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);
    
    fireEvent.change(screen.getByLabelText(/Sort by:/i), { target: { value: 'title' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      sortBy: 'title'
    });
  });
  
  test('displays current filter values', () => {
    const currentFilters = {
      status: 'completed',
      mediaType: 'movie',
      sortBy: 'rating',
      minRating: '7'
    };
    
    render(<ListFilters filters={currentFilters} onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByLabelText(/Status:/i)).toHaveValue('completed');
    expect(screen.getByLabelText(/Type:/i)).toHaveValue('movie');
    expect(screen.getByLabelText(/Sort by:/i)).toHaveValue('rating');
    expect(screen.getByLabelText(/Min Rating:/i)).toHaveValue('7');
  });
  
  test('clears filters when clear button is clicked', () => {
    const currentFilters = {
      status: 'completed',
      mediaType: 'movie'
    };
    
    render(<ListFilters filters={currentFilters} onFiltersChange={mockOnFiltersChange} />);
    
    fireEvent.click(screen.getByText(/Clear Filters/i));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });
  
  test('handles numeric rating filters correctly', () => {
    render(<ListFilters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);
    
    fireEvent.change(screen.getByLabelText(/Min Rating:/i), { target: { value: '8' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minRating: '8'
    });
  });
});
