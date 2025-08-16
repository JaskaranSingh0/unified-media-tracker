const mongoose = require('mongoose');
const User = require('../models/User');
const axios = require('axios');

// Retry function for API calls (same as discoverController)
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

// Function to enrich items that don't have display metadata
const enrichItemWithMetadata = async (item) => {
  // Check if item needs enrichment (missing title or poster)
  const needsEnrichment = !item.title || !item.poster || item.poster === null || item.poster === '';
  
  if (!needsEnrichment) {
    console.log(`Skipping enrichment for ${item.mediaType} ${item.apiId} - already has title and poster`);
    return item;
  }

  console.log(`Enriching metadata for ${item.mediaType} ${item.apiId}... (title: ${item.title || 'missing'}, poster: ${item.poster || 'missing'})`);
  
  try {
    let metadata = {};
    
    if (item.mediaType === 'movie' || item.mediaType === 'tv') {
      // Fetch from TMDB with retry logic
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey) {
        const response = await retryApiRequest(async () => {
          return await axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.apiId}`, {
            params: { api_key: tmdbKey },
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });
        });
        
        const data = response.data;
        metadata = {
          title: data.title || data.name,
          poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
          overview: data.overview,
          releaseDate: data.release_date,
          firstAirDate: data.first_air_date
        };
        console.log(`Successfully enriched TMDB metadata for ${item.mediaType} ${item.apiId}`);
      } else {
        console.warn('TMDB_API_KEY not configured, skipping TMDB enrichment');
      }
    } else if (item.mediaType === 'anime') {
      // Fetch from AniList with retry logic
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
          variables: { id: item.apiId }
        }, { 
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });
      });
      
      const data = response.data.data.Media;
      metadata = {
        title: data.title.english || data.title.romaji || data.title.native,
        poster: data.coverImage?.large,
        overview: data.description ? data.description.replace(/<[^>]+>/g, '') : null
      };
      console.log(`Successfully enriched AniList metadata for anime ${item.apiId}`);
    }
    
    // Return item with enriched metadata
    const enrichedItem = {
      ...item.toObject(),
      title: item.title || metadata.title || 'Unknown Title',
      poster: item.poster || metadata.poster,
      overview: item.overview || metadata.overview,
      releaseDate: item.releaseDate || metadata.releaseDate,
      firstAirDate: item.firstAirDate || metadata.firstAirDate
    };
    
    console.log(`Enrichment result for ${item.mediaType} ${item.apiId}: poster=${enrichedItem.poster ? 'YES' : 'NO'}`);
    return enrichedItem;
  } catch (error) {
    console.warn(`Failed to enrich metadata for ${item.mediaType} ${item.apiId}:`, error.message);
    // Return item with fallback values
    return {
      ...item.toObject(),
      title: item.title || 'Unknown Title',
      poster: item.poster || null,
      overview: item.overview || null,
      releaseDate: item.releaseDate || null,
      firstAirDate: item.firstAirDate || null
    };
  }
};

// Helper to find a subdocument
const findTrackedItem = (user, itemId) => user.trackedItems.id(itemId);

// Helper function to sort tracked items
const sortItems = (items, sortBy = 'dateAdded', order = 'desc') => {
  return [...items].sort((a, b) => {
    if (sortBy === 'dateAdded') {
      return order === 'desc' ? b.dateAdded - a.dateAdded : a.dateAdded - b.dateAdded;
    }
    if (sortBy === 'rating') {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
    }
    if (sortBy === 'dateCompleted') {
      const dateA = a.dateCompleted || new Date(0);
      const dateB = b.dateCompleted || new Date(0);
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    }
    return 0;
  });
};

// Helper function to filter tracked items
const filterItems = (items, filters) => {
  return items.filter(item => {
    let match = true;
    
    if (filters.mediaType && item.mediaType !== filters.mediaType) {
      match = false;
    }
    
    if (filters.status && item.status !== filters.status) {
      match = false;
    }
    
    if (filters.minRating && (!item.rating || item.rating < filters.minRating)) {
      match = false;
    }
    
    if (filters.maxRating && (!item.rating || item.rating > filters.maxRating)) {
      match = false;
    }
    
    return match;
  });
};

exports.addItem = async (req, res) => {
  try {
    const { apiId, mediaType, status, title, poster, overview, releaseDate, firstAirDate } = req.body;
    if (!apiId || !mediaType || !title) return res.status(400).json({ error: 'apiId, mediaType, and title required' });

    const user = await User.findById(req.user._id);
    // prevent duplicates: if same apiId+mediaType exists, update instead
    const existing = user.trackedItems.find(t => t.apiId === apiId && t.mediaType === mediaType);
    if (existing) {
      return res.status(400).json({ error: 'Item already tracked', item: existing });
    }

    const newItem = {
      apiId,
      mediaType,
      title,
      poster: poster || null,
      overview: overview || null,
      releaseDate: releaseDate || null,
      firstAirDate: firstAirDate || null,
      status: status || 'planToWatch',
      dateAdded: new Date()
    };
    user.trackedItems.push(newItem);
    await user.save();
    // return the last pushed element
    const added = user.trackedItems[user.trackedItems.length - 1];
    return res.json({ item: added });
  } catch (err) {
    console.error('addItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body; // allow rating, status, selfNote, watchedSeasons, dateCompleted
    const user = await User.findById(req.user._id);
    const item = findTrackedItem(user, itemId);
    if (!item) return res.status(404).json({ error: 'Tracked item not found' });

    // apply allowed updates
    const allowed = ['status', 'rating', 'selfNote', 'watchedSeasons', 'dateCompleted'];
    allowed.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(updates, k)) {
        item[k] = updates[k];
      }
    });

    // if status changed to completed and dateCompleted not set, set it
    if (item.status === 'completed' && !item.dateCompleted) {
      item.dateCompleted = new Date();
    }

    await user.save();
    return res.json({ item });
  } catch (err) {
    console.error('updateItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// New endpoint to toggle season watched status
exports.toggleSeason = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { seasonNumber, totalSeasons } = req.body;
    
    if (typeof seasonNumber !== 'number') {
      return res.status(400).json({ error: 'seasonNumber must be a number' });
    }

    const user = await User.findById(req.user._id);
    const item = findTrackedItem(user, itemId);
    if (!item) return res.status(404).json({ error: 'Tracked item not found' });

    // Only allow season tracking for TV shows and anime
    if (item.mediaType === 'movie') {
      return res.status(400).json({ error: 'Season tracking not available for movies' });
    }

    const watchedSeasons = item.watchedSeasons || [];
    const seasonIndex = watchedSeasons.indexOf(seasonNumber);
    
    if (seasonIndex > -1) {
      // Remove season from watched list
      watchedSeasons.splice(seasonIndex, 1);
      // If no seasons watched and was completed, move back to watching or planToWatch
      if (watchedSeasons.length === 0 && item.status === 'completed') {
        item.status = 'planToWatch';
        item.dateCompleted = null;
      } else if (watchedSeasons.length > 0 && item.status === 'completed') {
        item.status = 'watching';
        item.dateCompleted = null;
      }
    } else {
      // Add season to watched list
      watchedSeasons.push(seasonNumber);
      watchedSeasons.sort((a, b) => a - b); // Keep sorted
    }
    
    item.watchedSeasons = watchedSeasons;
    
    // Auto-update status based on watched seasons
    if (watchedSeasons.length > 0 && item.status === 'planToWatch') {
      item.status = 'watching';
    }

    // Auto-complete if all seasons are watched (when totalSeasons is provided)
    if (totalSeasons && watchedSeasons.length === totalSeasons && item.status !== 'completed') {
      item.status = 'completed';
      item.dateCompleted = new Date();
    }

    await user.save();
    return res.json({ item });
  } catch (err) {
    console.error('toggleSeason error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// New endpoint to get filtered and sorted lists
exports.getFilteredLists = async (req, res) => {
  try {
    const { status, mediaType, sortBy, order, minRating, maxRating } = req.query;
    
    const user = await User.findById(req.user._id).select('trackedItems');
    
    // Enrich items that don't have display metadata
    let items = await Promise.all(
      user.trackedItems.map(item => enrichItemWithMetadata(item))
    );

    // Apply filters
    const filters = {};
    if (status) filters.status = status;
    if (mediaType) filters.mediaType = mediaType;
    if (minRating) filters.minRating = parseInt(minRating);
    if (maxRating) filters.maxRating = parseInt(maxRating);

    items = filterItems(items, filters);

    // Apply sorting
    if (sortBy) {
      items = sortItems(items, sortBy, order || 'desc');
    }

    return res.json({ trackedItems: items });
  } catch (err) {
    console.error('getFilteredLists error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { trackedItems: { _id: itemId } } }
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getLists = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('trackedItems');
    console.log(`Found ${user.trackedItems.length} tracked items for user ${req.user._id}`);
    
    // Enrich items that don't have display metadata
    const enrichedItems = await Promise.all(
      user.trackedItems.map(async (item, index) => {
        console.log(`Processing item ${index + 1}/${user.trackedItems.length}: ${item.mediaType} ${item.apiId}`);
        return await enrichItemWithMetadata(item);
      })
    );
    
    console.log(`Successfully enriched ${enrichedItems.length} items`);
    return res.json({ trackedItems: enrichedItems });
  } catch (err) {
    console.error('getLists error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('trackedItems');
    const total = user.trackedItems.length;
    const byStatus = user.trackedItems.reduce((acc, it) => {
      acc[it.status] = (acc[it.status] || 0) + 1;
      return acc;
    }, {});
    // sample stats: average rating
    const ratings = user.trackedItems.filter(it => typeof it.rating === 'number').map(it => it.rating);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
    return res.json({ total, byStatus, avgRating });
  } catch (err) {
    console.error('getStats error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
