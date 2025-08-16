require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const axios = require('axios');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Retry function for API calls
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

// Function to fetch metadata from TMDB
const fetchTMDBMetadata = async (mediaType, apiId) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) throw new Error('TMDB_API_KEY not configured');

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
  return {
    title: data.title || data.name,
    poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
    overview: data.overview,
    releaseDate: data.release_date,
    firstAirDate: data.first_air_date
  };
};

// Function to fetch metadata from AniList
const fetchAniListMetadata = async (apiId) => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title { english romaji native }
        coverImage { large }
        description
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
  return {
    title: data.title.english || data.title.romaji || data.title.native,
    poster: data.coverImage?.large,
    overview: data.description ? data.description.replace(/<[^>]+>/g, '') : null
  };
};

async function migrateMetadata() {
  try {
    console.log('Starting metadata migration...');
    
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      console.log(`Processing user ${user._id}...`);
      let userUpdated = false;

      for (const item of user.trackedItems) {
        const needsUpdate = !item.title || !item.poster || item.poster === '' || item.poster === null;
        
        if (needsUpdate) {
          console.log(`  Updating ${item.mediaType} ${item.apiId}...`);
          
          try {
            let metadata;
            if (item.mediaType === 'movie' || item.mediaType === 'tv') {
              metadata = await fetchTMDBMetadata(item.mediaType, item.apiId);
            } else if (item.mediaType === 'anime') {
              metadata = await fetchAniListMetadata(item.apiId);
            }

            if (metadata) {
              item.title = item.title || metadata.title || 'Unknown Title';
              item.poster = item.poster || metadata.poster;
              item.overview = item.overview || metadata.overview;
              item.releaseDate = item.releaseDate || metadata.releaseDate;
              item.firstAirDate = item.firstAirDate || metadata.firstAirDate;
              userUpdated = true;
              console.log(`    ✓ Updated with title: "${item.title}", poster: ${item.poster ? 'YES' : 'NO'}`);
            }
          } catch (error) {
            console.log(`    ✗ Failed to fetch metadata: ${error.message}`);
            // Set fallback values to prevent validation errors
            if (!item.title) {
              item.title = 'Unknown Title';
              userUpdated = true;
            }
          }
        }
      }

      if (userUpdated) {
        await user.save();
        console.log(`  ✓ Saved user ${user._id}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrateMetadata();
