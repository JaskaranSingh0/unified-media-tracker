const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const listController = require('../controllers/listController');

// Create express app for testing
const app = express();
app.use(express.json());

// Setup routes for testing
app.post('/list/add', auth, listController.addItem);
app.put('/list/update/:itemId', auth, listController.updateItem);
app.put('/list/toggle-season/:itemId', auth, listController.toggleSeason);
app.get('/list/filtered', auth, listController.getFilteredLists);
app.delete('/list/:itemId', auth, listController.deleteItem);

describe('List Controller', () => {
  let testUser;
  let token;
  let itemId;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword123',
      trackedItems: []
    });

    // Generate token
    token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'testsecret');
  });

  describe('POST /list/add', () => {
    test('should add an item to user list', async () => {
      const itemData = {
        apiId: 12345,
        mediaType: 'movie',
        status: 'planToWatch',
        title: 'Test Movie'
      };

      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item added to list');
      expect(response.body.item).toHaveProperty('apiId', 12345);
      expect(response.body.item).toHaveProperty('mediaType', 'movie');
      expect(response.body.item).toHaveProperty('status', 'planToWatch');

      itemId = response.body.item._id;
    });

    test('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('apiId, mediaType, and status are required');
    });

    test('should prevent duplicate items', async () => {
      const itemData = {
        apiId: 12345,
        mediaType: 'movie',
        status: 'planToWatch'
      };

      // Add item first time
      await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      // Try to add same item again
      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already in your list');
    });
  });

  describe('PUT /list/update/:itemId', () => {
    beforeEach(async () => {
      // Add an item first
      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apiId: 12345,
          mediaType: 'movie',
          status: 'planToWatch'
        });
      itemId = response.body.item._id;
    });

    test('should update item status and rating', async () => {
      const updateData = {
        status: 'completed',
        rating: 8
      };

      const response = await request(app)
        .put(`/list/update/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.item.status).toBe('completed');
      expect(response.body.item.rating).toBe(8);
      expect(response.body.item.dateCompleted).toBeTruthy();
    });

    test('should return error for invalid item ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/list/update/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tracked item not found');
    });
  });

  describe('PUT /list/toggle-season/:itemId', () => {
    beforeEach(async () => {
      // Add a TV show first
      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apiId: 12345,
          mediaType: 'tv',
          status: 'planToWatch'
        });
      itemId = response.body.item._id;
    });

    test('should toggle season watched status', async () => {
      const response = await request(app)
        .put(`/list/toggle-season/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ seasonNumber: 1 });

      expect(response.status).toBe(200);
      expect(response.body.item.watchedSeasons).toContain(1);
      expect(response.body.item.status).toBe('watching');
    });

    test('should auto-complete series when all seasons watched', async () => {
      const response = await request(app)
        .put(`/list/toggle-season/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ seasonNumber: 1, totalSeasons: 1 });

      expect(response.status).toBe(200);
      expect(response.body.item.status).toBe('completed');
      expect(response.body.item.dateCompleted).toBeTruthy();
    });

    test('should not allow season tracking for movies', async () => {
      // Add a movie
      const movieResponse = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apiId: 67890,
          mediaType: 'movie',
          status: 'planToWatch'
        });

      const response = await request(app)
        .put(`/list/toggle-season/${movieResponse.body.item._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ seasonNumber: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Season tracking not available for movies');
    });
  });

  describe('GET /list/filtered', () => {
    beforeEach(async () => {
      // Add multiple items for filtering tests
      const items = [
        { apiId: 1, mediaType: 'movie', status: 'completed', rating: 8 },
        { apiId: 2, mediaType: 'tv', status: 'watching', rating: 7 },
        { apiId: 3, mediaType: 'anime', status: 'planToWatch', rating: null }
      ];

      for (const item of items) {
        await request(app)
          .post('/list/add')
          .set('Authorization', `Bearer ${token}`)
          .send(item);
      }
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/list/filtered?status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.trackedItems).toHaveLength(1);
      expect(response.body.trackedItems[0].status).toBe('completed');
    });

    test('should filter by media type', async () => {
      const response = await request(app)
        .get('/list/filtered?mediaType=tv')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.trackedItems).toHaveLength(1);
      expect(response.body.trackedItems[0].mediaType).toBe('tv');
    });

    test('should filter by minimum rating', async () => {
      const response = await request(app)
        .get('/list/filtered?minRating=8')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.trackedItems).toHaveLength(1);
      expect(response.body.trackedItems[0].rating).toBeGreaterThanOrEqual(8);
    });

    test('should sort by rating descending', async () => {
      const response = await request(app)
        .get('/list/filtered?sortBy=rating&order=desc')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.trackedItems[0].rating).toBeGreaterThanOrEqual(
        response.body.trackedItems[1].rating || 0
      );
    });
  });

  describe('DELETE /list/:itemId', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/list/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          apiId: 12345,
          mediaType: 'movie',
          status: 'planToWatch'
        });
      itemId = response.body.item._id;
    });

    test('should delete an item', async () => {
      const response = await request(app)
        .delete(`/list/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // Verify item is actually deleted
      const user = await User.findById(testUser._id);
      expect(user.trackedItems.id(itemId)).toBeNull();
    });
  });
});
