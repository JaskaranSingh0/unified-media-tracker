import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { discoverDetails, addListItem, getLists, updateListItem, toggleSeason, deleteListItem } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function MediaDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const { token } = useAuth();
  const [status, setStatus] = useState('planToWatch');
  const [myItem, setMyItem] = useState(null);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = async () => {
    const d = await discoverDetails(type, id);
    setDetails(d);
    // check if user already tracked
    const lists = await getLists(token);
    const found = lists.trackedItems.find(it => it.apiId === d.apiId && it.mediaType === d.mediaType);
    if (found) {
      setMyItem(found);
      setStatus(found.status);
      setNote(found.selfNote || '');
      setRating(found.rating || null);
    }
  };

  useEffect(() => { load(); }, [type, id]);

  const addToList = async () => {
    const payload = {
      apiId: details.apiId,
      mediaType: details.mediaType,
      status,
      title: details.title,
      poster: details.poster,
      overview: details.overview,
      releaseDate: details.releaseDate,
      firstAirDate: details.firstAirDate
    };
    const res = await addListItem(token, payload);
    setMyItem(res.item);
  };

  const saveEdits = async () => {
    if (!myItem) return;
    const res = await updateListItem(token, myItem._id, { status, selfNote: note, rating });
    setMyItem(res.item);
  };

  const handleSeasonToggle = async (seasonNumber) => {
    if (!myItem) return;
    try {
      const totalSeasons = details?.numberOfSeasons;
      const res = await toggleSeason(token, myItem._id, seasonNumber, totalSeasons);
      setMyItem(res.item);
      
      // Update status based on season progress
      if (res.item.status !== status) {
        setStatus(res.item.status);
      }
    } catch (err) {
      console.error('Error toggling season:', err);
    }
  };

  const handleRemoveFromList = async () => {
    if (!myItem) return;
    try {
      await deleteListItem(token, myItem._id);
      setMyItem(null);
      setStatus('planToWatch');
      setNote('');
      setRating(null);
      setShowDeleteConfirm(false);
      // Optionally redirect to lists page or show success message
      navigate('/lists');
    } catch (err) {
      console.error('Error removing from list:', err);
      alert('Failed to remove item from list. Please try again.');
    }
  };

  const renderSeasonTracker = () => {
    if (!myItem || details?.mediaType === 'movie') return null;

    // Get seasons to display (either from details or based on watched seasons)
    const totalSeasons = details?.numberOfSeasons || Math.max(...(myItem.watchedSeasons || []), 5);
    const seasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
    const watchedCount = myItem.watchedSeasons?.length || 0;
    const progressPercentage = totalSeasons > 0 ? Math.round((watchedCount / totalSeasons) * 100) : 0;

    const markAllWatched = async () => {
      const unwatchedSeasons = seasons.filter(s => !myItem.watchedSeasons?.includes(s));
      for (const season of unwatchedSeasons) {
        await handleSeasonToggle(season);
      }
    };

    const markAllUnwatched = async () => {
      const watchedSeasons = [...(myItem.watchedSeasons || [])];
      for (const season of watchedSeasons) {
        await handleSeasonToggle(season);
      }
    };

    return (
      <div className="season-tracker">
        <h4>Season Progress</h4>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
          <span className="progress-text">{progressPercentage}% complete ({watchedCount}/{totalSeasons})</span>
        </div>
        
        <div className="seasons-grid">
          {seasons.map(seasonNum => {
            const isWatched = myItem.watchedSeasons?.includes(seasonNum);
            return (
              <button
                key={seasonNum}
                className={`season-button ${isWatched ? 'watched' : 'unwatched'}`}
                onClick={() => handleSeasonToggle(seasonNum)}
                title={`Season ${seasonNum} - ${isWatched ? 'Watched' : 'Not watched'}`}
              >
                S{seasonNum}
                {isWatched && <span className="checkmark">✓</span>}
              </button>
            );
          })}
        </div>
        
        {watchedCount > 0 && (
          <div className="progress-summary">
            <p>Watched {watchedCount} of {totalSeasons} seasons</p>
            {myItem.status === 'completed' ? (
              <div className="completion-badge">✅ Series Completed!</div>
            ) : (
              <div className="season-actions">
                <button 
                  className="mark-all-btn"
                  onClick={markAllWatched}
                  disabled={watchedCount === totalSeasons}
                >
                  Mark All as Watched
                </button>
                {watchedCount > 0 && (
                  <button 
                    className="mark-none-btn"
                    onClick={markAllUnwatched}
                  >
                    Mark All as Unwatched
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {watchedCount === 0 && (
          <div className="season-actions">
            <button 
              className="mark-all-btn"
              onClick={markAllWatched}
            >
              Mark All as Watched
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="media-detail">
      <h1>{details ? details.title : 'Loading...'}</h1>
      {details && (
        <div className="detail-content">
          <div className="detail-poster">
            {details.poster && <img src={details.poster} alt={details.title} />}
          </div>
          
          <div className="detail-info">
            <p className="overview">{details.overview}</p>
            
            <div className="tracking-controls">
              <div className="control-group">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="planToWatch">Plan to Watch</option>
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="control-group">
                <label>Rating (1-10)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={rating || ''} 
                  onChange={e => setRating(e.target.value ? Number(e.target.value) : null)} 
                />
              </div>
              
              <div className="control-group">
                <label>Personal Note</label>
                <textarea 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  placeholder="Write your thoughts..."
                  rows="3"
                />
              </div>
              
              <div className="action-buttons">
                {!myItem ? (
                  <button className="primary-btn" onClick={addToList}>
                    Add to My List
                  </button>
                ) : (
                  <>
                    <button className="primary-btn" onClick={saveEdits}>
                      Save Changes
                    </button>
                    {!showDeleteConfirm ? (
                      <button 
                        className="danger-btn"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Remove from List
                      </button>
                    ) : (
                      <div className="delete-confirmation">
                        <p>Remove "{details?.title}" from your list?</p>
                        <div className="confirm-actions">
                          <button 
                            className="danger-btn"
                            onClick={handleRemoveFromList}
                          >
                            Yes, Remove
                          </button>
                          <button 
                            className="secondary-btn"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {renderSeasonTracker()}
          </div>
        </div>
      )}
    </div>
  );
}
