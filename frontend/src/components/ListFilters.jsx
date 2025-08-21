import React from 'react';

export default function ListFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    });
  };

  return (
    <div className="list-filters">
      <div className="filter-group">
        <label htmlFor="status-filter">Status:</label>
        <select 
          id="status-filter"
          value={filters.status || ''} 
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="planToWatch">Plan to Watch</option>
          <option value="watching">Watching</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="type-filter">Type:</label>
        <select 
          id="type-filter"
          value={filters.mediaType || ''} 
          onChange={e => handleFilterChange('mediaType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
          <option value="anime">Anime</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sort-filter">Sort by:</label>
        <select 
          id="sort-filter"
          value={filters.sortBy || 'dateAdded'} 
          onChange={e => handleFilterChange('sortBy', e.target.value)}
        >
          <option value="dateAdded">Date Added</option>
          <option value="title">Title (A-Z)</option>
          <option value="rating">Rating</option>
          <option value="dateCompleted">Date Completed</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="order-filter">Order:</label>
        <select 
          id="order-filter"
          value={filters.order || 'desc'} 
          onChange={e => handleFilterChange('order', e.target.value)}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="min-rating">Min Rating:</label>
        <input 
          id="min-rating"
          type="number" 
          min="1" 
          max="10" 
          value={filters.minRating || ''} 
          onChange={e => handleFilterChange('minRating', e.target.value)}
          placeholder="1-10"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="max-rating">Max Rating:</label>
        <input 
          id="max-rating"
          type="number" 
          min="1" 
          max="10" 
          value={filters.maxRating || ''} 
          onChange={e => handleFilterChange('maxRating', e.target.value)}
          placeholder="1-10"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="genres-filter">Genres (comma-separated):</label>
        <input
          id="genres-filter"
          type="text"
          value={filters.genres ? filters.genres.join(', ') : ''}
          onChange={e => handleFilterChange('genres', e.target.value.split(',').map(g => g.trim()).filter(g => g !== ''))}
          placeholder="e.g., Action, Drama"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="release-year-filter">Release Year:</label>
        <input
          id="release-year-filter"
          type="number"
          min="1900" 
          max={new Date().getFullYear() + 5} 
          value={filters.releaseYear || ''}
          onChange={e => handleFilterChange('releaseYear', e.target.value)}
          placeholder="e.g., 2023"
        />
      </div>

      <button 
        className="clear-filters-btn"
        onClick={() => onFiltersChange({})}
      >
        Clear Filters
      </button>
    </div>
  );
}
