require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const axios = require('axios');

// Re-using retryApiRequest from listController
const retryApiRequest = async (requestFn, maxRetries = 3, baseDelay = 1000) => {
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

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`API request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Re-using fetchAndProcessMetadata from listController
const fetchAndProcessMetadata = async (apiId, mediaType) => {
  try {
    let metadata = {
      title: 'Unknown Title',
      poster: null,
      overview: null,
      releaseDate: null,
      firstAirDate: null,
      genres: [],
      releaseYear: null
    };

    if (mediaType === 'movie' || mediaType === 'tv') {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey) {
        const response = await retryApiRequest(async () => {
          return await axios.get(`https://api.themoviedb.org/3/${mediaType}/${apiId}`, {
            params: { api_key: tmdbKey },
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });
        });

        const data = response.data;
        metadata.title = data.title || data.name;
        metadata.poster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
        metadata.overview = data.overview;
        metadata.releaseDate = data.release_date;
        metadata.firstAirDate = data.first_air_date;
        metadata.genres = data.genres ? data.genres.map(g => g.name) : [];
        metadata.releaseYear = data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : null);
        console.log(`Successfully fetched TMDB metadata for ${mediaType} ${apiId}`);
      } else {
        console.warn('TMDB_API_KEY not configured, skipping TMDB metadata fetch');
      }
    } else if (mediaType === 'anime') {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            title { english romaji native }
            coverImage { large }
            description
            genres
            startDate { year }
          }
        }
      `;

      const response = await retryApiRequest(async () => {
        return await axios.post('https://graphql.anilist.co', {
          query,
          variables: { id: apiId }
        }, { 
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const data = response.data.data.Media;
      metadata.title = data.title.english || data.title.romaji || data.title.native;
      metadata.poster = data.coverImage?.large;
      metadata.overview = data.description ? data.description.replace(/<[^>]+>/g, '') : null;
      metadata.genres = data.genres || [];
      metadata.releaseYear = data.startDate?.year || null;
      console.log(`Successfully fetched AniList metadata for anime ${apiId}`);
    }
    return metadata;
  } catch (error) {
    console.error(`Failed to fetch comprehensive metadata for ${mediaType} ${apiId}:`, error.message);
    return {
      title: 'Unknown Title',
      poster: null,
      overview: null,
      releaseDate: null,
      firstAirDate: null,
      genres: [],
      releaseYear: null
    };
  }
};


const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration.');

    const users = await User.find({});
    let updatedUsersCount = 0;
    let updatedItemsCount = 0;

    for (const user of users) {
      let userModified = false;
      for (const item of user.trackedItems) {
        // Check if genres or releaseYear are missing
        if (!item.genres || item.genres.length === 0 || !item.releaseYear) {
          console.log(`Processing item ${item.apiId} (${item.mediaType}) for user ${user._id}`);
          const metadata = await fetchAndProcessMetadata(item.apiId, item.mediaType);

          if (metadata.genres && metadata.genres.length > 0) {
            item.genres = metadata.genres;
            userModified = true;
            updatedItemsCount++;
          }
          if (metadata.releaseYear) {
            item.releaseYear = metadata.releaseYear;
            userModified = true;
            updatedItemsCount++;
          }
        }
      }
      if (userModified) {
        await user.save();
        updatedUsersCount++;
        console.log(`User ${user._id} updated.`);
      }
    }

    console.log(`Migration complete. Updated ${updatedItemsCount} items across ${updatedUsersCount} users.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

runMigration();
