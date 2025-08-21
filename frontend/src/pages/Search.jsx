import React, { useState, useEffect } from 'react';
import { discoverSearch, discoverTrending } from '../utils/api';
import MediaCard from '../components/MediaCard';
import { Link } from 'react-router-dom';

export default function Search() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Trending state
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Load trending content on component mount
  useEffect(() => {
    const loadTrending = async () => {
      try {
        setTrendingLoading(true);
        const [movies, tv, anime] = await Promise.all([
          discoverTrending('movie'),
          discoverTrending('tv'),
          discoverTrending('anime')
        ]);
        setTrendingMovies(movies.slice(0, 8));
        setTrendingTV(tv.slice(0, 8));
        setTrendingAnime(anime.slice(0, 8));
      } catch (error) {
        console.error('Error loading trending content:', error);
      } finally {
        setTrendingLoading(false);
      }
    };

    loadTrending();
  }, []);

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
        <div className="search-results">
          <h2>Search Results</h2>
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

      {/* Trending Sections */}
      {!results && (
        <div className="trending-sections">
          <h2>Trending Now</h2>
          
          {trendingLoading ? (
            <div>Loading trending content...</div>
          ) : (
            <>
              {/* Trending Movies */}
              <section className="trending-section">
                <div className="section-header">
                  <h3>Trending Movies</h3>
                </div>
                <div className="media-grid">
                  {trendingMovies.map(movie => (
                    <Link key={movie.apiId} to={`/media/movie/${movie.apiId}`}>
                      <div className="trending-card">
                        {movie.poster && <img src={movie.poster} alt={movie.title} />}
                        <div className="card-content">
                          <div className="title">{movie.title}</div>
                          <div className="meta">{movie.releaseDate?.slice(0, 4)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Trending TV Shows */}
              <section className="trending-section">
                <div className="section-header">
                  <h3>Trending TV Shows</h3>
                </div>
                <div className="media-grid">
                  {trendingTV.map(show => (
                    <Link key={show.apiId} to={`/media/tv/${show.apiId}`}>
                      <div className="trending-card">
                        {show.poster && <img src={show.poster} alt={show.title} />}
                        <div className="card-content">
                          <div className="title">{show.title}</div>
                          <div className="meta">{show.releaseDate?.slice(0, 4)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Trending Anime */}
              <section className="trending-section">
                <div className="section-header">
                  <h3>Trending Anime</h3>
                </div>
                <div className="media-grid">
                  {trendingAnime.map(anime => (
                    <Link key={anime.apiId} to={`/media/anime/${anime.apiId}`}>
                      <div className="trending-card">
                        {anime.poster && <img src={anime.poster} alt={anime.title} />}
                        <div className="card-content">
                          <div className="title">{anime.title}</div>
                          <div className="meta">{anime.releaseDate?.slice(0, 4)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
