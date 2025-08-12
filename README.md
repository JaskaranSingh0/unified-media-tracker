# Unified Media Tracker

A comprehensive application to track and manage your media consumption across different platforms.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/JaskaranSingh0/unified-media-tracker.git
   cd unified-media-tracker
   ```

2. Backend Setup:
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file in the backend directory with the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/media-tracker
     JWT_SECRET=your_jwt_secret_here
     ```

3. Frontend Setup:
   ```bash
   cd ../frontend
   npm install
   ```

4. Running the Application:
   - Start MongoDB service on your machine
   - In the backend directory:
     ```bash
     npm start
     ```
   - In the frontend directory:
     ```bash
     npm start
     ```
   - The frontend will be available at `http://localhost:3000`
   - The backend API will be available at `http://localhost:5000`

## Features

- User authentication and authorization
- Media search and discovery
- Personal media tracking lists
- Media details and information

## Technology Stack

- Frontend: React.js
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT
