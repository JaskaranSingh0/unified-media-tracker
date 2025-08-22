const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 * 5 }); // 5 minutes cache

const TMDB_BASE = 'https://api.themoviedb.org/3';
const tmdbKey = process.env.TMDB_API_KEY;

const buildTmdbImage = (path) => (path ? `https://image.tmdb.org/t/p/w500${path}` : null);

// Default axios config for TMDB requests
const tmdbAxiosConfig = {
  timeout: 15000, // Increased timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive'
  }
};

// Retry function for TMDB API calls
const retryTmdbRequest = async (requestFn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = error.code === 'ECONNRESET' || 
                              error.code === 'ETIMEDOUT' || 
                              error.code === 'ENOTFOUND' ||
                              (error.response && error.response.status >= 500);
      
      if (isLastAttempt || !isRetryableError) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`TMDB API request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * @swagger
 * /api/discover/search:
 *   get:
 *     summary: Search for movies, TV shows, and anime
 *     description: Proxies to TMDB (movies/tv) and AniList (anime). Returns grouped results by media type.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [movie, tv, anime] }
 *         required: false
 *         description: Restrict search to a media type
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing query
 */
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
        try {
          const tmdbRes = await retryTmdbRequest(async () => {
            return await axios.get(`${TMDB_BASE}/search/multi`, {
              params: { api_key: tmdbKey, query: q, include_adult: false },
              ...tmdbAxiosConfig
            });
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
        } catch (tmdbError) {
          console.warn('TMDB search failed (non-fatal):', tmdbError.message);
        }
      }
    }

    // Minimal AniList (GraphQL) unauthenticated search for "anime" titles
    if (!type || type === 'anime') {
      // Use AniList GraphQL API
      try {
        const query = `
          query ($search: String, $page: Int) {
            Page(page: $page, perPage: 10) {
              media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                id
                title { romaji english native }
                description
                coverImage { large }
                episodes
                status
              }
            }
          }
        `;
        const variables = { search: q, page: 1 };
        const anilistRes = await axios.post('https://graphql.anilist.co', { 
          query, 
          variables 
        }, { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        if (anilistRes.data && anilistRes.data.data && anilistRes.data.data.Page && anilistRes.data.data.Page.media) {
          anilistRes.data.data.Page.media.forEach(m => {
            results.anime.push({
              apiId: m.id,
              mediaType: 'anime',
              title: m.title.english || m.title.romaji || m.title.native,
              overview: (m.description || '').replace(/<[^>]+>/g, ''),
              poster: m.coverImage && m.coverImage.large,
              episodes: m.episodes,
              status: m.status
            });
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

/**
 * @swagger
 * /api/discover/trending:
 *   get:
 *     summary: Get trending items by type
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [movie, tv, anime] }
 *         required: false
 *         description: Media type (default movie)
 *     responses:
 *       200:
 *         description: Array of trending items
 */
exports.trending = async (req, res) => {
  try {
    const type = req.query.type || 'movie'; // movie | tv | anime
    const cacheKey = `trending:${type}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let items = [];

    if (type === 'anime') {
      // Use AniList for trending anime
      const query = `
        query {
          Page(page: 1, perPage: 20) {
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              title { english romaji native }
              coverImage { large }
              description
              genres
              startDate { year }
              popularity
            }
          }
        }
      `;

      try {
        const anilistRes = await axios.post('https://graphql.anilist.co', {
          query
        }, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (anilistRes.data && anilistRes.data.data && anilistRes.data.data.Page) {
          items = anilistRes.data.data.Page.media.map(anime => ({
            apiId: anime.id,
            mediaType: 'anime',
            title: anime.title.english || anime.title.romaji || anime.title.native,
            overview: anime.description ? anime.description.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : '',
            poster: anime.coverImage?.large || null,
            popularity: anime.popularity,
            releaseDate: anime.startDate?.year ? `${anime.startDate.year}-01-01` : null,
            genres: anime.genres
          }));
        }
      } catch (anilistError) {
        console.error('AniList API error:', anilistError.message);
        items = []; // Return empty array if AniList fails
      }
    } else {
      // Use TMDB for movies and TV shows
      if (!tmdbKey) return res.status(400).json({ error: 'TMDB_API_KEY not configured' });

      const url = `${TMDB_BASE}/trending/${type}/week`;
      
      try {
        const tmdbRes = await retryTmdbRequest(async () => {
          return await axios.get(url, { 
            params: { api_key: tmdbKey },
            ...tmdbAxiosConfig
          });
        });

        items = tmdbRes.data.results.map(r => ({
          apiId: r.id,
          mediaType: type,
          title: r.title || r.name,
          overview: r.overview,
          poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          popularity: r.popularity,
          releaseDate: r.release_date || r.first_air_date
        }));
      } catch (apiError) {
        console.error('TMDB API error:', apiError.message);
        items = []; // Return empty array if TMDB fails
      }
    }
      
    cache.set(cacheKey, items);
    return res.json(items);
  } catch (err) {
    console.error('trending error', err);
    // Return empty array instead of 500 error
    return res.json([]);
  }
};

// Get latest releases: for movies/tv from TMDB's latest/now playing endpoints; for anime use AniList airing season
/**
 * @swagger
 * /api/discover/latest:
 *   get:
 *     summary: Get latest/now playing items by type
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [movie, tv, anime] }
 *         required: false
 *         description: Media type (default movie)
 *     responses:
 *       200:
 *         description: Array of latest items
 */
exports.latest = async (req, res) => {
  try {
    const type = req.query.type || 'movie'; // movie | tv | anime
    const cacheKey = `latest:${type}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let items = [];

    if (type === 'anime') {
      // Use AniList for current season anime (approximation of latest)
      const query = `
        query ($season: MediaSeason, $year: Int) {
          Page(page: 1, perPage: 20) {
            media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
              id
              title { english romaji native }
              coverImage { large }
              description
              genres
              startDate { year month day }
            }
          }
        }
      `;

      // Derive current season and year (simple mapping)
      const now = new Date();
      const month = now.getUTCMonth() + 1;
      const year = now.getUTCFullYear();
      const season = month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';

      try {
        const anilistRes = await axios.post('https://graphql.anilist.co', {
          query,
          variables: { season, year }
        }, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        if (anilistRes.data?.data?.Page?.media) {
          items = anilistRes.data.data.Page.media.map(m => ({
            apiId: m.id,
            mediaType: 'anime',
            title: m.title.english || m.title.romaji || m.title.native,
            overview: m.description ? m.description.replace(/<[^>]*>/g, '') : '',
            poster: m.coverImage?.large || null,
            genres: m.genres,
            releaseDate: `${m.startDate?.year || year}-01-01`
          }));
        }
      } catch (err) {
        console.error('AniList latest error:', err.message);
        items = [];
      }
    } else {
      if (!tmdbKey) return res.status(400).json({ error: 'TMDB_API_KEY not configured' });

      try {
        // For movies: use now_playing; for tv: use on_the_air
        const path = type === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
        const url = `${TMDB_BASE}${path}`;
        const tmdbRes = await retryTmdbRequest(async () => {
          return await axios.get(url, { params: { api_key: tmdbKey, region: 'US' }, ...tmdbAxiosConfig });
        });
        items = tmdbRes.data.results.map(r => ({
          apiId: r.id,
          mediaType: type,
          title: r.title || r.name,
          overview: r.overview,
          poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          releaseDate: r.release_date || r.first_air_date
        }));
      } catch (err) {
        console.error('TMDB latest error:', err.message);
        items = [];
      }
    }

    cache.set(cacheKey, items);
    return res.json(items);
  } catch (err) {
    console.error('latest error', err);
    return res.json([]);
  }
};

/**
 * @swagger
 * /api/discover/details/{type}/{id}:
 *   get:
 *     summary: Get details for a media item
 *     parameters:
 *       - in: path
 *         name: type
 *         schema: { type: string, enum: [movie, tv, anime] }
 *         required: true
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Media details
 *       404:
 *         description: Not found
 */
exports.getDetails = async (req, res) => {
  try {
    const { type, id } = req.params; // type: movie|tv|anime
    if (!type || !id) return res.status(400).json({ error: 'type and id required' });

    if ((type === 'movie' || type === 'tv') && tmdbKey) {
      try {
        const url = `${TMDB_BASE}/${type}/${id}`;
        const tmdbRes = await retryTmdbRequest(async () => {
          return await axios.get(url, { 
            params: { api_key: tmdbKey },
            ...tmdbAxiosConfig
          });
        });
        
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
          numberOfSeasons: r.number_of_seasons || null,
          raw: r
        });
      } catch (tmdbError) {
        console.error('TMDB details error:', tmdbError.message);
        return res.status(404).json({ error: 'Media not found or API unavailable' });
      }
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
