# Project Brief: Unified Media Tracker (Version 3.0 - MERN Stack Specification)

## 1. Executive Summary
This document outlines the requirements for **"Unified Media Tracker,"** a personal web application for tracking movies, TV series, and anime. The project will be developed using the **MERN stack**. The primary goal is to provide a seamless and centralized platform for users to manage their watch history, current progress, and future watchlist. The **Minimum Viable Product (MVP)** will focus exclusively on personal tracking functionalities, establishing a strong foundation for future social features.

## 2. Target Audience
**Cinephiles**, **TV show enthusiasts**, and **anime fans** who currently use multiple apps (or spreadsheets/notes) to track their viewing habits and want a single, elegant solution built with modern JavaScript technologies.

## 3. User Stories (MVP)

### Onboarding:
- As a new user, I want to sign up quickly using my social media account so I don't have to remember another password.
- As a new user, I want to see a grid of popular titles upon signup so I can immediately add things I've seen and get a feel for the app.

### Discovery & Search:
- As a user, I want to search for any movie, TV show, or anime so I can find specific titles to add to my lists.
- As a user, I want to see search results separated by media type (Movies, TV, Anime).
- As a user, I want to see "Trending," "Latest," and personalized "Recommended" sections on my dashboard.

### Tracking & Management:
- As a user, I want to add any title to a "Plan to Watch" or "Completed" list.
- As a user, I want to track my progress on TV shows and anime on a "Watching" list.
- As a user, I want to mark individual seasons of a show as watched.
- As a user, I want a show to automatically move to "Completed" when I finish the last season.
- As a user, I want to add a personal rating to titles I have completed.
- As a user, I want to write a private "self-note" for any title.
- As a user, I want to easily edit a title's status, my rating, or my note.
- As a user, I want to sort and filter my lists (e.g., by my rating, by genre).

### Account Management:
- As a user, I want a settings page where I can change my password or delete my account.

## 4. Specified Technical Stack: MERN
This project will be a full-stack JavaScript application built using the **MERN stack**.

### MongoDB (Database):
A NoSQL, document-oriented database will store all user and application data.

#### Data Models (Collections):
- **users:** Stores user account information.
  - _id: ObjectId
  - email: String (unique, indexed)
  - password: String (hashed)
  - socialProviderId: String (e.g., Google ID)
  - trackedItems: [Array of `trackedItemSchema`]
  
#### Embedded `trackedItemSchema`:
This sub-document within the user model will hold all tracking information for a single media item, making data retrieval for a logged-in user extremely fast.
- **apiId:** Number (The ID from TMDB or AniList)
- **mediaType:** String ("movie", "tv", "anime")
- **status:** String ("planToWatch", "watching", "completed")
- **rating:** Number (1-10, nullable)
- **selfNote:** String (nullable)
- **dateAdded:** Date
- **dateCompleted:** Date (nullable)
- **watchedSeasons:** [Number] (Array of season numbers that have been checked)

### Express.js & Node.js (Backend):
A Node.js runtime environment with the Express.js framework will power the RESTful API server.

#### Responsibilities:
- Handle user authentication (JWTs - JSON Web Tokens) and authorization.
- Provide API endpoints for all CRUD (Create, Read, Update, Delete) operations on user lists.
- Interface with the external TMDB and AniList APIs, acting as a proxy to fetch media data. This abstracts the external APIs from the React frontend and protects API keys.
- Handle business logic (e.g., calculating statistics, generating recommendations).

#### Example API Endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/list/add`
- `PUT /api/list/update/:itemId`
- `GET /api/dashboard/stats`
- `GET /api/discover/trending?type=movie`
- `GET /api/search?query=...`

### React (Frontend):
A component-based library for building a dynamic, fast, and interactive Single Page Application (SPA).

#### Architecture:
- **Component Hierarchy:** The UI will be broken down into reusable components (e.g., `<Dashboard>`, `<MediaCard>`, `<SearchBar>`, `<FilterControls>`, `<LoginModal>`).
- **State Management:** Utilize React's built-in Context API for managing global state like user authentication status. For more complex client-side state, a library like Redux Toolkit could be considered.
- **Routing:** React Router will be used to handle client-side navigation between different pages (`/dashboard`, `/search`, `/settings`, `/media/:id`) without full-page reloads.
- **API Communication:** Use a library like Axios or the native fetch API to make requests to the Express backend.

## 5. Functional & Page-by-Page Requirements (MVP)
(This section remains the same as the previous version, outlining the specifics of the Onboarding, Dashboard, Title Detail, User Lists, and Search pages, as they are independent of the stack choice.)

## 6. Non-Functional Requirements

### Performance:
- The backend will cache popular, non-user-specific API responses (e.g., "Trending" lists) to reduce latency and API rate-limiting issues.
- The React frontend will use techniques like code-splitting and lazy loading for components.

### Responsiveness:
- The UI will be built using a mobile-first approach, ensuring full usability on all screen sizes, likely with the help of a CSS framework like **Tailwind CSS** or a component library like **Material-UI**.

### Security:
- Implement JWT-based secure authentication.
- Store all secrets and API keys as environment variables (`.env` file) on the server.
- Apply standard security headers and practices.

## 7. Future Roadmap (Post-MVP)

### Phase 2: Expanded Tracking
- Introduce "Dropped," "On-Hold," and "Rewatching" statuses. This would involve adding a new field to the `trackedItemSchema` in MongoDB.

### Phase 3: Social Features
- Implement a friends system. This would require a new friends array field in the `users` collection and new API endpoints to manage relationships.

### Phase 4: Advanced Features
- Custom user-created lists and a more sophisticated recommendation engine.
