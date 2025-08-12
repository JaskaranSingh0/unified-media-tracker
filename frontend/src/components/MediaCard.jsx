import React from 'react';
import { Link } from 'react-router-dom';

export default function MediaCard({ item }) {
  // item should be a partial object from backend or discovery
  const type = item.mediaType || (item.apiId && item.releaseDate ? 'movie' : 'movie');

  return (
    <div className="media-card">
      <Link to={`/media/${type}/${item.apiId}`}>
        {item.poster ? <img src={item.poster} alt={item.title} /> : <div className="placeholder">No image</div>}
        <div className="media-meta">
          <div className="title">{item.title}</div>
          <div className="muted">{item.releaseDate || item.firstAirDate || ''}</div>
        </div>
      </Link>
    </div>
  );
}
