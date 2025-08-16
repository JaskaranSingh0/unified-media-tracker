import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLists, getStats, getDashboardStats, discoverTrending, toggleSeason } from '../utils/api';
import MediaCard from '../components/MediaCard';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { token, user, fetchMe } = useAuth();
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);

  const load = async () => {
    if (!token) {
      console.log('Dashboard: No token available, skipping load');
      return;
    }
    
    try {
      console.log('Dashboard: Starting to load data...');
      
      console.log('Dashboard: Fetching lists...');
      const res = await getLists(token);
      setLists(res.trackedItems || []);
      console.log('Dashboard: Lists loaded successfully');
      
      console.log('Dashboard: Fetching stats...');
      const s = await getStats(token);
      setStats(s);
      console.log('Dashboard: Stats loaded successfully');
      
      console.log('Dashboard: Fetching trending...');
      const t = await discoverTrending('movie');
      setTrending(t.slice(0, 8));
      console.log('Dashboard: Trending loaded successfully');
      
    } catch (err) {
      console.error('Dashboard load error:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method
      });
    }
  };

  useEffect(() => { 
    if (token) {
      load(); 
    }
  }, [token]);

  const handleSeasonToggle = async (itemId, seasonNumber) => {
    try {
      await toggleSeason(token, itemId, seasonNumber);
      // Reload the lists to reflect changes
      load();
    } catch (err) {
      console.error('Error toggling season:', err);
    }
  };

  const recentlyWatched = lists
    .filter(item => item.status === 'completed' && item.dateCompleted)
    .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))
    .slice(0, 6);

  const currentlyWatching = lists.filter(item => item.status === 'watching');
  const planToWatch = lists.filter(item => item.status === 'planToWatch').slice(0, 6);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.username}!</h1>
        <Link to="/lists" className="view-all-link">View All Lists →</Link>
      </div>

      {/* Quick Stats */}
      <section className="stats-overview">
        {stats ? (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.total}</h3>
              <p>Total Tracked</p>
            </div>
            <div className="stat-card">
              <h3>{stats.byStatus?.watching || 0}</h3>
              <p>Currently Watching</p>
            </div>
            <div className="stat-card">
              <h3>{stats.byStatus?.completed || 0}</h3>
              <p>Completed</p>
            </div>
            <div className="stat-card">
              <h3>{stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}</h3>
              <p>Average Rating</p>
            </div>
          </div>
        ) : (
          <div>Loading stats...</div>
        )}
      </section>

      {/* Currently Watching */}
      {currentlyWatching.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Continue Watching</h3>
            <Link to="/lists?status=watching">View All</Link>
          </div>
          <div className="media-grid">
            {currentlyWatching.map(item => (
              <MediaCard 
                key={item._id} 
                item={item} 
                showProgress={true}
                onSeasonToggle={handleSeasonToggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Completed */}
      {recentlyWatched.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Recently Completed</h3>
            <Link to="/lists?status=completed">View All</Link>
          </div>
          <div className="media-grid">
            {recentlyWatched.map(item => (
              <MediaCard 
                key={item._id} 
                item={item} 
                showProgress={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Plan to Watch */}
      {planToWatch.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Plan to Watch</h3>
            <Link to="/lists?status=planToWatch">View All</Link>
          </div>
          <div className="media-grid">
            {planToWatch.map(item => (
              <MediaCard 
                key={item._id} 
                item={item} 
                showProgress={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3>Trending Movies</h3>
          <Link to="/search">Discover More</Link>
        </div>
        <div className="media-grid">
          {trending.map(t => (
            <Link key={t.apiId} to={`/media/movie/${t.apiId}`}>
              <div className="trending-card">
                {t.poster && <img src={t.poster} alt={t.title} />}
                <div className="card-content">
                  <div className="title">{t.title}</div>
                  <div className="meta">{t.releaseDate?.slice(0, 4)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
