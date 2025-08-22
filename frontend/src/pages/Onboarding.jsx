import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { discoverTrending, addListItem } from '../utils/api';

export default function Onboarding() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [addingItems, setAddingItems] = useState(new Set());
  const [addedItems, setAddedItems] = useState(new Set());

  useEffect(() => {
    const loadPopularContent = async () => {
      try {
        setLoading(true);
        
        // Load popular content with fallbacks
        const loadWithFallback = async (type) => {
          try {
            const data = await discoverTrending(type);
            return Array.isArray(data) ? data : [];
          } catch (error) {
            console.warn(`Failed to load ${type} content:`, error.message);
            return [];
          }
        };

        const [movies, tv, anime] = await Promise.all([
          loadWithFallback('movie'),
          loadWithFallback('tv'),
          loadWithFallback('anime')
        ]);
        
        setPopularMovies(movies.slice(0, 12));
        setPopularTV(tv.slice(0, 12));
        setPopularAnime(anime.slice(0, 12));
      } catch (error) {
        console.error('Error loading popular content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPopularContent();
  }, []);

  const handleQuickAdd = async (item, status) => {
    const itemKey = `${item.mediaType}-${item.apiId}`;
    
    if (addingItems.has(itemKey) || addedItems.has(itemKey)) {
      return;
    }

    try {
      setAddingItems(prev => new Set([...prev, itemKey]));
      
      await addListItem(token, {
        apiId: item.apiId,
        mediaType: item.mediaType,
        status: status
      });
      
      setAddedItems(prev => new Set([...prev, itemKey]));
    } catch (error) {
      console.error('Error adding item:', error);
      // Show error feedback if needed
    } finally {
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleSkipOnboarding = () => {
    navigate('/');
  };

  const renderMediaGrid = (items, title) => {
    if (!items.length) return null;

    return (
      <section className="onboarding-section">
        <h3>{title}</h3>
        <div className="onboarding-grid">
          {items.map(item => {
            const itemKey = `${item.mediaType}-${item.apiId}`;
            const isAdding = addingItems.has(itemKey);
            const isAdded = addedItems.has(itemKey);

            return (
              <div key={itemKey} className="onboarding-card">
                <Link to={`/media/${item.mediaType}/${item.apiId}`}>
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} />
                  ) : (
                    <div className="placeholder">No image</div>
                  )}
                  <div className="card-content">
                    <div className="title">{item.title}</div>
                    <div className="meta">
                      {item.releaseDate?.slice(0, 4) || 'Unknown'}
                    </div>
                  </div>
                </Link>
                
                <div className="quick-actions">
                  {isAdded ? (
                    <div className="added-indicator">✓ Added</div>
                  ) : (
                    <>
                      <button 
                        className="quick-btn plan-btn"
                        onClick={() => handleQuickAdd(item, 'planToWatch')}
                        disabled={isAdding}
                      >
                        {isAdding ? '...' : 'Plan to Watch'}
                      </button>
                      <button 
                        className="quick-btn completed-btn"
                        onClick={() => handleQuickAdd(item, 'completed')}
                        disabled={isAdding}
                      >
                        {isAdding ? '...' : 'Completed'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Welcome to Unified Media Tracker!</h1>
          <p>Loading popular content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1>Welcome to Unified Media Tracker, {user?.username}!</h1>
        <p>Let's get you started by adding some popular titles you've watched or want to watch.</p>
        <div className="onboarding-actions">
          <button 
            className="btn-secondary" 
            onClick={handleSkipOnboarding}
          >
            Skip for now
          </button>
          <Link to="/" className="btn-primary">
            Continue to Dashboard
          </Link>
        </div>
      </div>

      <div className="onboarding-content">
        {renderMediaGrid(popularMovies, 'Popular Movies')}
        {renderMediaGrid(popularTV, 'Popular TV Shows')}
        {renderMediaGrid(popularAnime, 'Popular Anime')}
      </div>

      <div className="onboarding-footer">
        <p>You can always search for more titles and manage your lists from the dashboard.</p>
        <Link to="/" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
