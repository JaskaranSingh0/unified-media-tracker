const User = require('../models/User');

exports.getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
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
    user.trackedItems.forEach(item => {
      // Count by media type
      stats.total[item.mediaType]++;
      // Count by status
      stats.status[item.status]++;
      
      // Get recently completed items
      if (item.status === 'completed' && item.dateCompleted) {
        stats.recentlyCompleted.push(item);
      }
      
      // Get currently watching items
      if (item.status === 'watching') {
        stats.currentlyWatching.push(item);
      }
    });

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
