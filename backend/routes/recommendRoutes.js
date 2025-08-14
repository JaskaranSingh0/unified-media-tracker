const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRecommendations } = require('../controllers/recommendController');

router.get('/', auth, getRecommendations);

module.exports = router;
