# Unified Media Tracker - AI Agent Instructions

## Project Overview
Unified Media Tracker is a MERN stack application for tracking movies, TV series, and anime across different platforms. The application allows users to manage their watch history, current progress, and future watchlist with features like social authentication, progress tracking, and personalized recommendations.

## Core Data Models

### User Schema
```javascript
{
  _id: ObjectId,
  email: String,          // unique, indexed
  password: String,       // hashed
  socialProviderId: String, // e.g., Google ID
  trackedItems: [{        // embedded schema for fast retrieval
    apiId: Number,        // TMDB or AniList ID
    mediaType: String,    // "movie", "tv", "anime"
    status: String,       // "planToWatch", "watching", "completed"
    rating: Number,       // 1-10, nullable
    selfNote: String,     // nullable
    dateAdded: Date,
    dateCompleted: Date,  // nullable
    watchedSeasons: [Number] // Array of completed season numbers
  }]
}
```

## Architecture

### Frontend (`/frontend`)
- Single Page Application (SPA) using Create React App
- Component structure:
  - `/pages`: Main route components (`Dashboard`, `Search`, `MediaDetail`, `Settings`)
  - `/components`: Reusable UI components (`MediaCard`, `SearchBar`, `FilterControls`, `LoginModal`)
  - `/context`: Global state management with `AuthContext`
- Mobile-first responsive design using TailwindCSS
- Client-side routing with React Router
- API communication through centralized `api.js` utility

### Backend (`/backend`)
- Express.js REST API with the following structure:
  - `/auth`: Authentication endpoints with JWT and social login support
  - `/discover`: Media discovery with TMDB/AniList integration and caching
  - `/list`: User media list management with MongoDB operations
- Performance optimizations:
  - Response caching using `node-cache` for popular, non-user-specific data
  - Embedded document pattern in MongoDB for fast user data retrieval
- Security:
  - JWT-based authentication with secure token management
  - Environment-based configuration for sensitive data
  - Standard security headers and CORS configuration

## Development Workflow

### Running the Application
1. Backend:
   ```bash
   cd backend
   npm install
   npm run dev    # Starts server with nodemon
   ```

2. Frontend:
   ```bash
   cd frontend
   npm install
   npm start     # Runs on http://localhost:3000
   ```

### Project Conventions & Patterns

#### Frontend
- React functional components with hooks for state and effects
- Route-based code splitting for optimized loading
- Centralized API communication through `api.js`:
  ```javascript
  // Example API utility pattern
  export const mediaApi = {
    search: (query) => api.get(`/discover/search?q=${query}`),
    updateStatus: (itemId, status) => api.put(`/list/update/${itemId}`, { status })
  };
  ```
- Mobile-first Tailwind CSS classes following BEM-like pattern

#### Backend
- RESTful controller organization:
  ```javascript
  // Controller pattern example
  const updateMediaStatus = async (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;  // From JWT middleware
    // ... update logic
  };
  ```
- Caching strategy:
  - Cache trending/popular media lists (12 hour TTL)
  - No caching for user-specific data
  - Invalidation on relevant updates

### Common Development Tasks

#### Adding New Features
1. Media Status Updates:
   ```javascript
   // 1. Add controller method in listController.js
   // 2. Add route in listRoutes.js
   // 3. Add API method in frontend api.js
   // 4. Update UI components to use new endpoint
   ```

2. New Media Type Integration:
   - Update `mediaType` enum in schemas
   - Add type-specific API integration in `discoverController.js`
   - Add UI support in `MediaCard` and filter components

## External Services
- TMDB API: Movie and TV show data
- AniList API: Anime data
- MongoDB Atlas: Database hosting
- OAuth Providers: Social authentication

## Environment Configuration
```bash
# Backend (.env)
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret-key
TMDB_API_KEY=your-tmdb-key
ANILIST_CLIENT_ID=your-anilist-id

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_OAUTH_CALLBACK=http://localhost:3000/auth/callback
```

## Common Issues & Solutions
- Rate limiting: Implement exponential backoff in API calls
- Memory usage: Monitor embedded document size in user collection
- Auth tokens: Handle refresh flow for expired JWTs
