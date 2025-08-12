import React, { useState } from 'react';
import { discoverSearch } from '../utils/api';
import MediaCard from '../components/MediaCard';

export default function Search() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await discoverSearch(q, type === 'all' ? undefined : type);
    setResults(res);
    setLoading(false);
  };

  return (
    <div>
      <h1>Search</h1>
      <form onSubmit={submit} className="search-form">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search movies, TV, anime..." />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="all">All</option>
          <option value="movie">Movie</option>
          <option value="tv">TV</option>
          <option value="anime">Anime</option>
        </select>
        <button type="submit">Search</button>
      </form>

      {loading && <div>Searching...</div>}

      {results && (
        <div>
          <h3>Movies</h3>
          <div className="grid-cards">
            {(results.movies || []).map(m => <MediaCard key={`m-${m.apiId}`} item={m} />)}
          </div>

          <h3>TV</h3>
          <div className="grid-cards">
            {(results.tv || []).map(m => <MediaCard key={`t-${m.apiId}`} item={m} />)}
          </div>

          <h3>Anime</h3>
          <div className="grid-cards">
            {(results.anime || []).map(m => <MediaCard key={`a-${m.apiId}`} item={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
