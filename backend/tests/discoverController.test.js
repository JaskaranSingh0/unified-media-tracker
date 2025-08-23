const request = require('supertest');
const express = require('express');
const axios = require('axios');
const discoverController = require('../controllers/discoverController');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

const app = express();
app.use(express.json());

app.get('/discover/search', discoverController.search);
app.get('/discover/trending', discoverController.trending);
app.get('/discover/details/:type/:id', discoverController.getDetails);

describe('Discover Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /discover/search', () => {
    test('should search movies successfully', async () => {
      const mockTMDBResponse = {
        data: {
          results: [
            {
              id: 123,
              title: 'Test Movie',
              overview: 'A test movie',
              poster_path: '/test.jpg',
              release_date: '2023-01-01'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/search')
        .query({ query: 'test', type: 'movie' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].title).toBe('Test Movie');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('search/movie'),
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'test'
          })
        })
      );
    });

    test('should search TV shows successfully', async () => {
      const mockTMDBResponse = {
        data: {
          results: [
            {
              id: 456,
              name: 'Test TV Show',
              overview: 'A test TV show',
              poster_path: '/test-tv.jpg',
              first_air_date: '2023-01-01'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/search')
        .query({ query: 'test', type: 'tv' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].name).toBe('Test TV Show');
    });

    test('should search anime successfully', async () => {
      const mockAniListResponse = {
        data: {
          data: {
            Page: {
              media: [
                {
                  id: 789,
                  title: { romaji: 'Test Anime' },
                  description: 'A test anime',
                  coverImage: { large: '/test-anime.jpg' },
                  startDate: { year: 2023 }
                }
              ]
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockAniListResponse);

      const response = await request(app)
        .get('/discover/search')
        .query({ query: 'test', type: 'anime' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].title.romaji).toBe('Test Anime');
    });

    test('should return 400 if query is missing', async () => {
      const response = await request(app)
        .get('/discover/search')
        .query({ type: 'movie' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('query parameter');
    });

    test('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const response = await request(app)
        .get('/discover/search')
        .query({ query: 'test', type: 'movie' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to search');
    });
  });

  describe('GET /discover/trending', () => {
    test('should get trending movies', async () => {
      const mockTMDBResponse = {
        data: {
          results: [
            {
              id: 111,
              title: 'Trending Movie',
              poster_path: '/trending.jpg'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/trending')
        .query({ type: 'movie' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].title).toBe('Trending Movie');
    });

    test('should get trending TV shows', async () => {
      const mockTMDBResponse = {
        data: {
          results: [
            {
              id: 222,
              name: 'Trending TV Show',
              poster_path: '/trending-tv.jpg'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/trending')
        .query({ type: 'tv' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].name).toBe('Trending TV Show');
    });

    test('should default to movie type if no type specified', async () => {
      const mockTMDBResponse = {
        data: { results: [] }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/trending');

      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('trending/movie'),
        expect.any(Object)
      );
    });
  });

  describe('GET /discover/details/:type/:id', () => {
    test('should get movie details', async () => {
      const mockTMDBResponse = {
        data: {
          id: 123,
          title: 'Detailed Movie',
          overview: 'Detailed overview',
          genres: [{ id: 1, name: 'Action' }],
          runtime: 120,
          release_date: '2023-01-01'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/details/movie/123');

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Detailed Movie');
      expect(response.body.genres).toEqual([{ id: 1, name: 'Action' }]);
    });

    test('should get TV details', async () => {
      const mockTMDBResponse = {
        data: {
          id: 456,
          name: 'Detailed TV Show',
          overview: 'Detailed TV overview',
          genres: [{ id: 2, name: 'Drama' }],
          number_of_seasons: 3
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);

      const response = await request(app)
        .get('/discover/details/tv/456');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Detailed TV Show');
      expect(response.body.number_of_seasons).toBe(3);
    });

    test('should return 400 for invalid media type', async () => {
      const response = await request(app)
        .get('/discover/details/invalid/123');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid media type');
    });

    test('should handle not found errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      const response = await request(app)
        .get('/discover/details/movie/999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Media not found');
    });
  });
});
