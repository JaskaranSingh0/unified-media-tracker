const mongoose = require('mongoose');

const trackedItemSchema = new mongoose.Schema({
  apiId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv', 'anime'], required: true },
  status: { type: String, enum: ['planToWatch', 'watching', 'completed'], default: 'planToWatch' },
  rating: { type: Number, min: 1, max: 10 },
  selfNote: { type: String },
  dateAdded: { type: Date, default: Date.now },
  dateCompleted: { type: Date },
  watchedSeasons: { type: [Number], default: [] }
}, { _id: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: { type: String, required: true, trim: true },
  password: { type: String, minlength: 6 },
  socialProvider: {
    type: { type: String, enum: ['google', 'facebook', 'github'] },
    id: String
  },
  trackedItems: { type: [trackedItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
