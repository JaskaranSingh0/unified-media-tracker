const User = require('../models/User');

exports.getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const stats = {
      total: {
        movies: 0,
        tv: 0,
        anime: 0
      },
      status: {
        planToWatch: 0,
        watching: 0,
        completed: 0
      },
      recentlyCompleted: [],
      currentlyWatching: []
    };

    // Calculate stats
    let totalRatings = 0;
    let ratedItemsCount = 0;
    const ratingsByMediaType = { movie: { sum: 0, count: 0 }, tv: { sum: 0, count: 0 }, anime: { sum: 0, count: 0 } };
    const genreDistribution = {};
    const releaseYearDistribution = {};

    user.trackedItems.forEach(item => {
      // Count by media type
      stats.total[item.mediaType]++;
      // Count by status
      stats.status[item.status]++;

      // Calculate average rating
      if (typeof item.rating === 'number') {
        totalRatings += item.rating;
        ratedItemsCount++;
        ratingsByMediaType[item.mediaType].sum += item.rating;
        ratingsByMediaType[item.mediaType].count++;
      }

      // Genre distribution
      if (item.genres && item.genres.length > 0) {
        item.genres.forEach(genre => {
          genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
        });
      }

      // Release year distribution
      if (item.releaseYear) {
        releaseYearDistribution[item.releaseYear] = (releaseYearDistribution[item.releaseYear] || 0) + 1;
      }

      // Get recently completed items
      if (item.status === 'completed' && item.dateCompleted) {
        stats.recentlyCompleted.push(item);
      }

      // Get currently watching items
      if (item.status === 'watching') {
        stats.currentlyWatching.push(item);
      }
    });

    stats.averageRating = ratedItemsCount > 0 ? (totalRatings / ratedItemsCount) : null;
    stats.averageRatingByMediaType = {
      movie: ratingsByMediaType.movie.count > 0 ? (ratingsByMediaType.movie.sum / ratingsByMediaType.movie.count) : null,
      tv: ratingsByMediaType.tv.count > 0 ? (ratingsByMediaType.tv.sum / ratingsByMediaType.tv.count) : null,
      anime: ratingsByMediaType.anime.count > 0 ? (ratingsByMediaType.anime.sum / ratingsByMediaType.anime.count) : null,
    };
    stats.genreDistribution = genreDistribution;
    stats.releaseYearDistribution = releaseYearDistribution;

    // Sort and limit arrays
    stats.recentlyCompleted.sort((a, b) => b.dateCompleted - a.dateCompleted);
    stats.recentlyCompleted = stats.recentlyCompleted.slice(0, 5);
    stats.currentlyWatching = stats.currentlyWatching.slice(0, 5);

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Error fetching dashboard stats' });
  }
};
