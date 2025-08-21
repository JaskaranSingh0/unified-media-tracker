const mongoose = require('mongoose');

const trackedItemSchema = new mongoose.Schema({
  apiId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv', 'anime'], required: true },
  title: { type: String, required: true },
  poster: { type: String },
  overview: { type: String },
  releaseDate: { type: String },
  firstAirDate: { type: String },
  genres: { type: [String], default: [] }, // New field for genres
  releaseYear: { type: Number }, // New field for release year
  status: { type: String, enum: ['planToWatch', 'watching', 'completed'], default: 'planToWatch' },
  rating: { type: Number, min: 1, max: 10 },
  selfNote: { type: String },
  dateAdded: { type: Date, default: Date.now },
  dateCompleted: { type: Date },
  watchedSeasons: { type: [Number], default: [] }
}, { _id: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if no social provider
      return !this.socialProvider || !this.socialProvider.type;
    }
  },
  socialProvider: {
    type: {
      type: String,
      enum: ['google'],
      required: false
    },
    id: {
      type: String,
      required: false
    }
  },
  trackedItems: { type: [trackedItemSchema], default: [] }
});

module.exports = mongoose.model('User', userSchema);
