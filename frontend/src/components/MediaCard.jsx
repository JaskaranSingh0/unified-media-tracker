import React from 'react';
import { Link } from 'react-router-dom';

export default function MediaCard({ item, showProgress = false, onSeasonToggle, onRemove }) {
  // item should be a partial object from backend or discovery
  const type = item.mediaType || (item.apiId && item.releaseDate ? 'movie' : 'movie');
  
  const renderProgress = () => {
    if (!showProgress || !item.watchedSeasons || item.mediaType === 'movie') {
      return null;
    }

    const watchedCount = item.watchedSeasons.length;
    const statusText = item.status === 'completed' ? 'Completed' : 
                     item.status === 'watching' ? `Watching (${watchedCount} seasons)` :
                     'Plan to Watch';

    return (
      <div className="progress-info">
        <span className={`status-badge ${item.status}`}>{statusText}</span>
        {item.rating && <span className="rating">★ {item.rating}/10</span>}
      </div>
    );
  };

  const renderSeasonTracker = () => {
    if (!showProgress || !onSeasonToggle || item.mediaType === 'movie') {
      return null;
    }

    // Assuming we have totalSeasons from the details API
    // For now, we'll show seasons based on what's been watched plus a few more
    const maxSeason = Math.max(...(item.watchedSeasons || []), 5);
    const seasons = Array.from({ length: maxSeason }, (_, i) => i + 1);

    return (
      <div className="season-tracker">
        <div className="seasons-title">Seasons:</div>
        <div className="seasons-list">
          {seasons.map(seasonNum => (
            <button
              key={seasonNum}
              className={`season-btn ${item.watchedSeasons?.includes(seasonNum) ? 'watched' : 'unwatched'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSeasonToggle(item._id, seasonNum);
              }}
              title={`Season ${seasonNum} - ${item.watchedSeasons?.includes(seasonNum) ? 'Watched' : 'Not watched'}`}
            >
              {seasonNum}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="media-card">
      <Link to={`/media/${type}/${item.apiId}`}>
        {item.poster ? <img src={item.poster} alt={item.title} /> : <div className="placeholder">No image</div>}
        <div className="media-meta">
          <div className="title">{item.title}</div>
          <div className="muted">{item.releaseDate || item.firstAirDate || ''}</div>
          {renderProgress()}
        </div>
      </Link>
      {renderSeasonTracker()}
      {showProgress && onRemove && (
        <button 
          className="remove-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item._id, item.title);
          }}
          title={`Remove "${item.title}" from list`}
        >
          ×
        </button>
      )}
    </div>
  );
}
