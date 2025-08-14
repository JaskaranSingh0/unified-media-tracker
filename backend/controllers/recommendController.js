const User = require('../models/User');
const axios = require('axios');

const getSimilarTMDB = async (mediaType, id) => {
  const response = await axios.get(
    `https://api.themoviedb.org/3/${mediaType}/${id}/similar`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`
      }
    }
  );
  return response.data.results;
};

const getSimilarAnime = async (id) => {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        recommendations(sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title { userPreferred }
              coverImage { large }
              description
              averageScore
            }
          }
        }
      }
    }
  `;

  const response = await axios.post('https://graphql.anilist.co', {
    query,
    variables: { id }
  });
  return response.data.data.Media.recommendations.nodes.map(n => n.mediaRecommendation);
};

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const recommendations = {
      movies: [],
      tv: [],
      anime: []
    };

    // Get completed items with high ratings (8-10)
    const highlyRated = user.trackedItems.filter(
      item => item.status === 'completed' && item.rating >= 8
    );

    // Get recommendations based on highly rated items
    for (const item of highlyRated.slice(0, 3)) { // Use top 3 rated items
      if (item.mediaType === 'anime') {
        const similar = await getSimilarAnime(item.apiId);
        recommendations.anime.push(...similar);
      } else {
        const similar = await getSimilarTMDB(item.mediaType, item.apiId);
        recommendations[item.mediaType === 'movie' ? 'movies' : 'tv'].push(...similar);
      }
    }

    // Remove duplicates and items user already has
    const userApiIds = new Set(user.trackedItems.map(item => item.apiId));
    
    Object.keys(recommendations).forEach(type => {
      recommendations[type] = recommendations[type]
        .filter(item => !userApiIds.has(item.id))
        .filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        )
        .slice(0, 10); // Limit to top 10 recommendations per type
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Error generating recommendations' });
  }
};
