import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLists, getStats, getDashboardStats, toggleSeason, deleteListItem } from '../utils/api';
import MediaCard from '../components/MediaCard';
import { Link } from 'react-router-dom';
import { StatusDoughnutChart, GenreBarChart, ReleaseYearBarChart } from '../components/Charts'; // Import chart components

export default function Dashboard() {
  const { token, user, fetchMe } = useAuth();
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState({ show: false, itemId: null, title: '' });

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
      
      console.log('Dashboard: Fetching dashboard stats...');
      const s = await getDashboardStats(token);
      setStats(s);
      console.log('Dashboard: Dashboard stats loaded successfully');
      
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

  const handleRemoveRequest = (itemId, title) => {
    setRemoveConfirm({ show: true, itemId, title });
  };

  const handleRemoveConfirm = async () => {
    try {
      await deleteListItem(token, removeConfirm.itemId);
      // Reload dashboard data
      load();
      setRemoveConfirm({ show: false, itemId: null, title: '' });
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item. Please try again.');
    }
  };

  const handleRemoveCancel = () => {
    setRemoveConfirm({ show: false, itemId: null, title: '' });
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
      {/* Quick Stats */}
      <section className="stats-overview">
        {stats ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{stats.total.movies + stats.total.tv + stats.total.anime}</h3>
                <p>Total Tracked</p>
              </div>
              <div className="stat-card">
                <h3>{stats.status?.watching || 0}</h3>
                <p>Currently Watching</p>
              </div>
              <div className="stat-card">
                <h3>{stats.status?.completed || 0}</h3>
                <p>Completed</p>
              </div>
              <div className="stat-card">
                <h3>{stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}</h3>
                <p>Average Rating</p>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <StatusDoughnutChart data={stats.status} />
              </div>
              {Object.keys(stats.genreDistribution).length > 0 && (
                <div className="chart-container">
                  <GenreBarChart data={stats.genreDistribution} />
                </div>
              )}
              {Object.keys(stats.releaseYearDistribution).length > 0 && (
                <div className="chart-container">
                  <ReleaseYearBarChart data={stats.releaseYearDistribution} />
                </div>
              )}
            </div>
          </>
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
                onRemove={handleRemoveRequest}
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
                onRemove={handleRemoveRequest}
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
                onRemove={handleRemoveRequest}
              />
            ))}
          </div>
        </section>
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
