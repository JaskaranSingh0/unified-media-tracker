import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilteredLists, toggleSeason } from '../utils/api';
import MediaCard from '../components/MediaCard';
import ListFilters from '../components/ListFilters';

export default function UserLists() {
  const { token } = useAuth();
  const [lists, setLists] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadLists();
  }, [filters, token]);

  const handleSeasonToggle = async (itemId, seasonNumber) => {
    try {
      await toggleSeason(token, itemId, seasonNumber);
      // Reload the lists to reflect changes
      loadLists();
    } catch (err) {
      console.error('Error toggling season:', err);
    }
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
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="user-lists">
      <h1>My Lists</h1>
      
      <ListFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
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
    </div>
  );
}
