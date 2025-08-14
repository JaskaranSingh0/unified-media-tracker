const mongoose = require('mongoose');
const User = require('../models/User');

// Helper function to sort tracked items
const sortItems = (items, sortBy = 'dateAdded', order = 'desc') => {
  return [...items].sort((a, b) => {
    if (sortBy === 'dateAdded') {
      return order === 'desc' ? b.dateAdded - a.dateAdded : a.dateAdded - b.dateAdded;
    }
    if (sortBy === 'rating') {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
    }
    if (sortBy === 'dateCompleted') {
      const dateA = a.dateCompleted || new Date(0);
      const dateB = b.dateCompleted || new Date(0);
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    }
    return 0;
  });
};

// Helper function to filter tracked items
const filterItems = (items, filters) => {
  return items.filter(item => {
    let match = true;
    
    if (filters.mediaType && item.mediaType !== filters.mediaType) {
      match = false;
    }
    
    if (filters.status && item.status !== filters.status) {
      match = false;
    }
    
    if (filters.minRating && (!item.rating || item.rating < filters.minRating)) {
      match = false;
    }
    
    if (filters.maxRating && (!item.rating || item.rating > filters.maxRating)) {
      match = false;
    }
    
    return match;
  });
};

exports.addItem = async (req, res) => {
  try {
    const { apiId, mediaType, status } = req.body;
    if (!apiId || !mediaType) return res.status(400).json({ error: 'apiId and mediaType required' });

    const user = await User.findById(req.user._id);
    // prevent duplicates: if same apiId+mediaType exists, update instead
    const existing = user.trackedItems.find(t => t.apiId === apiId && t.mediaType === mediaType);
    if (existing) {
      return res.status(400).json({ error: 'Item already tracked', item: existing });
    }

    const newItem = {
      apiId,
      mediaType,
      status: status || 'planToWatch',
      dateAdded: new Date()
    };
    user.trackedItems.push(newItem);
    await user.save();
    // return the last pushed element
    const added = user.trackedItems[user.trackedItems.length - 1];
    return res.json({ item: added });
  } catch (err) {
    console.error('addItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body; // allow rating, status, selfNote, watchedSeasons, dateCompleted
    const user = await User.findById(req.user._id);
    const item = findTrackedItem(user, itemId);
    if (!item) return res.status(404).json({ error: 'Tracked item not found' });

    // apply allowed updates
    const allowed = ['status', 'rating', 'selfNote', 'watchedSeasons', 'dateCompleted'];
    allowed.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(updates, k)) {
        item[k] = updates[k];
      }
    });

    // if status changed to completed and dateCompleted not set, set it
    if (item.status === 'completed' && !item.dateCompleted) {
      item.dateCompleted = new Date();
    }

    await user.save();
    return res.json({ item });
  } catch (err) {
    console.error('updateItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user = await User.findById(req.user._id);
    const item = findTrackedItem(user, itemId);
    if (!item) return res.status(404).json({ error: 'Tracked item not found' });
    item.remove();
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteItem error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getLists = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('trackedItems');
    return res.json({ trackedItems: user.trackedItems });
  } catch (err) {
    console.error('getLists error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('trackedItems');
    const total = user.trackedItems.length;
    const byStatus = user.trackedItems.reduce((acc, it) => {
      acc[it.status] = (acc[it.status] || 0) + 1;
      return acc;
    }, {});
    // sample stats: average rating
    const ratings = user.trackedItems.filter(it => typeof it.rating === 'number').map(it => it.rating);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
    return res.json({ total, byStatus, avgRating });
  } catch (err) {
    console.error('getStats error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
