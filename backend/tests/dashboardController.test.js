const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const app = express();
app.use(express.json());

app.get('/dashboard/stats', auth, dashboardController.getDashboardStats);

describe('Dashboard Controller', () => {
  let testUser;
  let token;

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Create test user with sample tracked items
    testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword123',
      trackedItems: [
        {
          apiId: 1,
          mediaType: 'movie',
          status: 'completed',
          rating: 8,
          title: 'Test Movie 1',
          genres: ['Action', 'Adventure'],
          releaseYear: 2023,
          dateCompleted: new Date('2023-06-01')
        },
        {
          apiId: 2,
          mediaType: 'tv',
          status: 'completed',
          rating: 9,
          title: 'Test TV Show 1',
          genres: ['Drama'],
          releaseYear: 2022,
          dateCompleted: new Date('2023-07-01')
        },
        {
          apiId: 3,
          mediaType: 'anime',
          status: 'watching',
          title: 'Test Anime 1',
          genres: ['Fantasy'],
          releaseYear: 2023,
          watchedSeasons: [1]
        },
        {
          apiId: 4,
          mediaType: 'movie',
          status: 'planToWatch',
          title: 'Test Movie 2',
          genres: ['Comedy'],
          releaseYear: 2024
        },
        {
          apiId: 5,
          mediaType: 'tv',
          status: 'completed',
          rating: 7,
          title: 'Test TV Show 2',
          genres: ['Action', 'Sci-Fi'],
          releaseYear: 2021,
          dateCompleted: new Date('2023-05-01')
        }
      ]
    });

    token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'testsecret');
  });

  describe('GET /dashboard/stats', () => {
    test('should return comprehensive dashboard statistics', async () => {
      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Check basic counts
      expect(response.body.total).toBe(5);
      expect(response.body.byStatus.completed).toBe(3);
      expect(response.body.byStatus.watching).toBe(1);
      expect(response.body.byStatus.planToWatch).toBe(1);

      // Check media type breakdown
      expect(response.body.byMediaType.movie).toBe(2);
      expect(response.body.byMediaType.tv).toBe(2);
      expect(response.body.byMediaType.anime).toBe(1);

      // Check average rating (should be (8 + 9 + 7) / 3 = 8)
      expect(response.body.avgRating).toBe(8);

      // Check genre counts
      expect(response.body.topGenres).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ genre: 'Action', count: 2 }),
          expect.objectContaining({ genre: 'Adventure', count: 1 }),
          expect.objectContaining({ genre: 'Drama', count: 1 })
        ])
      );

      // Check release year distribution
      expect(response.body.byReleaseYear).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ year: 2023, count: 2 }),
          expect.objectContaining({ year: 2022, count: 1 }),
          expect.objectContaining({ year: 2021, count: 1 }),
          expect.objectContaining({ year: 2024, count: 1 })
        ])
      );
    });

    test('should handle user with no tracked items', async () => {
      // Create user with no tracked items
      const emptyUser = await User.create({
        email: 'empty@example.com',
        username: 'emptyuser',
        password: 'hashedpassword123',
        trackedItems: []
      });

      const emptyToken = jwt.sign({ id: emptyUser._id }, process.env.JWT_SECRET || 'testsecret');

      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${emptyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
      expect(response.body.byStatus.completed).toBe(0);
      expect(response.body.byStatus.watching).toBe(0);
      expect(response.body.byStatus.planToWatch).toBe(0);
      expect(response.body.avgRating).toBe(0);
      expect(response.body.topGenres).toEqual([]);
      expect(response.body.byReleaseYear).toEqual([]);
    });

    test('should calculate average rating correctly for items without ratings', async () => {
      // Update user to have items without ratings
      await User.findByIdAndUpdate(testUser._id, {
        trackedItems: [
          {
            apiId: 1,
            mediaType: 'movie',
            status: 'completed',
            rating: 8,
            title: 'Rated Movie'
          },
          {
            apiId: 2,
            mediaType: 'movie',
            status: 'completed',
            // No rating
            title: 'Unrated Movie'
          }
        ]
      });

      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.avgRating).toBe(8); // Should only count rated items
    });

    test('should sort genres by count in descending order', async () => {
      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      const genreCounts = response.body.topGenres.map(g => g.count);
      const sortedCounts = [...genreCounts].sort((a, b) => b - a);
      expect(genreCounts).toEqual(sortedCounts);
    });

    test('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(403);
    });

    test('should return error with no token', async () => {
      const response = await request(app)
        .get('/dashboard/stats');

      expect(response.status).toBe(401);
    });

    test('should handle database errors gracefully', async () => {
      // Use an invalid user ID to simulate database error
      const invalidToken = jwt.sign({ id: 'invalid_id' }, process.env.JWT_SECRET || 'testsecret');

      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server error');
    });

    test('should return recently completed items', async () => {
      const response = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.recentlyCompleted).toBeDefined();
      expect(Array.isArray(response.body.recentlyCompleted)).toBe(true);
      
      // Should be sorted by completion date (most recent first)
      const completionDates = response.body.recentlyCompleted
        .map(item => new Date(item.dateCompleted));
      
      for (let i = 1; i < completionDates.length; i++) {
        expect(completionDates[i-1].getTime()).toBeGreaterThanOrEqual(completionDates[i].getTime());
      }
    });
  });
});
