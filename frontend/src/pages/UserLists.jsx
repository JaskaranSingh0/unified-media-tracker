import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilteredLists, toggleSeason, deleteListItem } from '../utils/api';
import MediaCard from '../components/MediaCard';
import ListFilters from '../components/ListFilters';

export default function UserLists() {
  const { token } = useAuth();
  const [lists, setLists] = useState([]);
  const [filters, setFilters] = useState(() => {
    // Load filters from localStorage on component mount
    const savedFilters = localStorage.getItem('list-filters');
    return savedFilters ? JSON.parse(savedFilters) : {};
  });
  const [loading, setLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState({ show: false, itemId: null, title: '' });

  const loadLists = async () => {
    try {
      setLoading(true);
      const res = await getFilteredLists(token, filters);
      setLists(res.trackedItems || []);
    } catch (err) {
      console.error('Error loading lists:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('list-filters', JSON.stringify(filters));
  }, [filters]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const resetFilters = () => {
    setFilters({});
    localStorage.removeItem('list-filters');
  };

  useEffect(() => {
    loadLists();
  }, [filters, token]);

  const handleSeasonToggle = async (itemId, seasonNumber) => {
    const originalLists = [...lists];
    
    // Optimistically update the season
    setLists(prevLists => 
      prevLists.map(item => {
        if (item._id === itemId) {
          const watchedSeasons = item.watchedSeasons || [];
          const isWatched = watchedSeasons.includes(seasonNumber);
          
          return {
            ...item,
            watchedSeasons: isWatched 
              ? watchedSeasons.filter(s => s !== seasonNumber)
              : [...watchedSeasons, seasonNumber],
            status: !isWatched && item.status === 'planToWatch' ? 'watching' : item.status
          };
        }
        return item;
      })
    );

    try {
      await toggleSeason(token, itemId, seasonNumber);
      // Reload to ensure consistency with server state
      loadLists();
    } catch (err) {
      console.error('Error toggling season:', err);
      // Revert the optimistic update
      setLists(originalLists);
    }
  };

  const handleRemoveRequest = (itemId, title) => {
    setRemoveConfirm({ show: true, itemId, title });
  };

  const handleRemoveConfirm = async () => {
    const originalLists = [...lists];
    const itemIdToRemove = removeConfirm.itemId;

    // Optimistically update the UI
    setLists(prevLists => prevLists.filter(item => item._id !== itemIdToRemove));
    setRemoveConfirm({ show: false, itemId: null, title: '' });

    try {
      await deleteListItem(token, itemIdToRemove);
      // Success - UI already updated
    } catch (err) {
      console.error('Error removing item:', err);
      // Revert the optimistic update
      setLists(originalLists);
      setRemoveConfirm({ show: false, itemId: null, title: '' });
      alert('Failed to remove item. Please try again.');
    }
  };

  const handleRemoveCancel = () => {
    setRemoveConfirm({ show: false, itemId: null, title: '' });
  };

  const groupedLists = {
    planToWatch: lists.filter(item => item.status === 'planToWatch'),
    watching: lists.filter(item => item.status === 'watching'),
    completed: lists.filter(item => item.status === 'completed')
  };

  const renderListSection = (title, items, status) => (
    <div className="list-section">
      <h3>{title} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="empty-message">No items in this list</p>
      ) : (
        <div className="media-grid">
          {items.map(item => (
            <MediaCard 
              key={item._id} 
              item={item} 
              showProgress={true}
              onSeasonToggle={handleSeasonToggle}
              onRemove={handleRemoveRequest}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="user-lists">
      <div className="lists-header">
        <h1>My Lists</h1>
        {Object.keys(filters).length > 0 && (
          <button className="reset-filters-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        )}
      </div>
      
      <ListFilters 
        filters={filters} 
        onFiltersChange={handleFiltersChange} 
      />

      {loading ? (
        <div className="loading">Loading your lists...</div>
      ) : (
        <>
          {/* Show all items if filters are applied, otherwise show grouped by status */}
          {Object.keys(filters).length > 0 ? (
            <div className="filtered-results">
              <h3>Filtered Results ({lists.length})</h3>
              {lists.length === 0 ? (
                <p className="empty-message">No items match your filters</p>
              ) : (
                <div className="media-grid">
                  {lists.map(item => (
                    <MediaCard 
                      key={item._id} 
                      item={item} 
                      showProgress={true}
                      onSeasonToggle={handleSeasonToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grouped-lists">
              {renderListSection('Plan to Watch', groupedLists.planToWatch, 'planToWatch')}
              {renderListSection('Currently Watching', groupedLists.watching, 'watching')}
              {renderListSection('Completed', groupedLists.completed, 'completed')}
            </div>
          )}
        </>
      )}

      {/* Remove Confirmation Modal */}
      {removeConfirm.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Remove from List</h3>
            <p>Are you sure you want to remove "{removeConfirm.title}" from your list?</p>
            <div className="modal-actions">
              <button 
                className="danger-btn"
                onClick={handleRemoveConfirm}
              >
                Yes, Remove
              </button>
              <button 
                className="secondary-btn"
                onClick={handleRemoveCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
