const express = require('express');
const router = express.Router();
const discoverController = require('../controllers/discoverController');
const rateLimit = require('express-rate-limit');

// Basic rate limiter to protect external API proxies
const discoverLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	limit: 60, // limit each IP to 60 requests per minute
	standardHeaders: true,
	legacyHeaders: false
});

router.get('/search', discoverLimiter, discoverController.search);
router.get('/trending', discoverLimiter, discoverController.trending);
router.get('/latest', discoverLimiter, discoverController.latest);
router.get('/details/:type/:id', discoverLimiter, discoverController.getDetails);

module.exports = router;
