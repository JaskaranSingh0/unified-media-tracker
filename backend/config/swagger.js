const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Unified Media Tracker API',
      version: '1.0.0',
      description: 'API documentation for tracking movies, TV shows, and anime',
      contact: {
        name: 'API Support',
        email: 'support@unified-media-tracker.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            trackedItems: {
              type: 'array',
              items: { $ref: '#/components/schemas/TrackedItem' }
            }
          }
        },
        TrackedItem: {
          type: 'object',
          properties: {
            apiId: { type: 'integer' },
            mediaType: { type: 'string', enum: ['movie', 'tv', 'anime'] },
            status: { type: 'string', enum: ['planToWatch', 'watching', 'completed'] },
            rating: { type: 'integer', minimum: 1, maximum: 10 },
            selfNote: { type: 'string' },
            dateAdded: { type: 'string', format: 'date-time' },
            dateCompleted: { type: 'string', format: 'date-time' },
            watchedSeasons: { type: 'array', items: { type: 'integer' } }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options);
