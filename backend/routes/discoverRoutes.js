const express = require('express');
const router = express.Router();
const discoverController = require('../controllers/discoverController');

router.get('/search', discoverController.search);
router.get('/trending', discoverController.trending);
router.get('/details/:type/:id', discoverController.getDetails);

module.exports = router;
