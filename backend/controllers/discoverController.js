const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 * 5 }); // 5 minutes cache

const TMDB_BASE = 'https://api.themoviedb.org/3';
const tmdbKey = process.env.TMDB_API_KEY;

const buildTmdbImage = (path) => (path ? `https://image.tmdb.org/t/p/w500${path}` : null);

exports.search = async (req, res) => {
  try {
    const q = req.query.q;
    const type = req.query.type; // optional: movie|tv|anime
    if (!q) return res.status(400).json({ error: 'query param q is required' });

    // For anime: we'll query AniList (GraphQL) — implemented minimally (requires AniList token or unauthenticated queries)
    // For simplicity this endpoint will do:
    // - TMDB search for movies & tv
    // - (OPTIONAL) AniList search for anime if type === anime or if no results
    const cacheKey = `search:${type || 'all'}:${q}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const results = { movies: [], tv: [], anime: [] };

    if (!type || type === 'movie' || type === 'tv') {
      // TMDB multi search
      if (!tmdbKey) {
        // skip TMDB if no key
        console.warn('TMDB_API_KEY missing - skipping TMDB requests for search');
      } else {
        const tmdbRes = await axios.get(`${TMDB_BASE}/search/multi`, {
          params: { api_key: tmdbKey, query: q, include_adult: false }
        });
        tmdbRes.data.results.forEach(r => {
          if (r.media_type === 'movie') {
            results.movies.push({
              apiId: r.id,
              mediaType: 'movie',
              title: r.title || r.name,
              overview: r.overview,
              poster: buildTmdbImage(r.poster_path),
              releaseDate: r.release_date
            });
          } else if (r.media_type === 'tv') {
            results.tv.push({
              apiId: r.id,
              mediaType: 'tv',
              title: r.name,
              overview: r.overview,
              poster: buildTmdbImage(r.poster_path),
              firstAirDate: r.first_air_date
            });
          }
        });
      }
    }

    // Minimal AniList (GraphQL) unauthenticated search for "anime" titles
    if (!type || type === 'anime') {
      // Use AniList GraphQL API
      try {
        const query = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
              title { romaji english native }
              description
              coverImage { large }
              episodes
              status
            }
          }
        `;
        const variables = { search: q };
        const anilistRes = await axios.post('https://graphql.anilist.co', { query, variables }, { headers: { 'Content-Type': 'application/json' } });
        if (anilistRes.data && anilistRes.data.data && anilistRes.data.data.Media) {
          const m = anilistRes.data.data.Media;
          results.anime.push({
            apiId: m.id,
            mediaType: 'anime',
            title: m.title.english || m.title.romaji || m.title.native,
            overview: (m.description || '').replace(/<[^>]+>/g, ''),
            poster: m.coverImage && m.coverImage.large,
            episodes: m.episodes,
            status: m.status
          });
        }
      } catch (err) {
        // don't fail entire search if AniList fails
        console.warn('AniList search failed (non-fatal):', err.message);
      }
    }

    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error('search error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.trending = async (req, res) => {
  try {
    const type = req.query.type || 'movie'; // movie | tv
    const cacheKey = `trending:${type}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    if (!tmdbKey) return res.status(400).json({ error: 'TMDB_API_KEY not configured' });

    // call TMDB trending endpoint
    const url = `${TMDB_BASE}/trending/${type}/week`;
    const tmdbRes = await axios.get(url, { params: { api_key: tmdbKey } });

    const items = tmdbRes.data.results.map(r => ({
      apiId: r.id,
      mediaType: type,
      title: r.title || r.name,
      overview: r.overview,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      popularity: r.popularity,
      releaseDate: r.release_date || r.first_air_date
    }));
    cache.set(cacheKey, items);
    return res.json(items);
  } catch (err) {
    console.error('trending error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getDetails = async (req, res) => {
  try {
    const { type, id } = req.params; // type: movie|tv|anime
    if (!type || !id) return res.status(400).json({ error: 'type and id required' });

    if ((type === 'movie' || type === 'tv') && tmdbKey) {
      const url = `${TMDB_BASE}/${type}/${id}`;
      const tmdbRes = await axios.get(url, { params: { api_key: tmdbKey } });
      const r = tmdbRes.data;
      return res.json({
        apiId: r.id,
        mediaType: type,
        title: r.title || r.name,
        overview: r.overview,
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        genres: r.genres,
        runtime: r.runtime || r.episode_run_time,
        seasons: r.seasons || null,
        raw: r
      });
    } else if (type === 'anime') {
      // AniList lookup
      try {
        const query = `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              title { romaji english native }
              description
              coverImage { large }
              episodes
              status
              genres
            }
          }
        `;
        const variables = { id: parseInt(id, 10) };
        const anilistRes = await axios.post('https://graphql.anilist.co', { query, variables }, { headers: { 'Content-Type': 'application/json' } });
        const m = anilistRes.data.data.Media;
        return res.json({
          apiId: m.id,
          mediaType: 'anime',
          title: m.title.english || m.title.romaji || m.title.native,
          overview: (m.description || '').replace(/<[^>]+>/g, ''),
          poster: m.coverImage && m.coverImage.large,
          episodes: m.episodes,
          status: m.status,
          genres: m.genres
        });
      } catch (err) {
        console.warn('anilist details failed:', err.message);
        return res.status(500).json({ error: 'AniList details fetch failed' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported type or API key missing' });
    }
  } catch (err) {
    console.error('getDetails error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
