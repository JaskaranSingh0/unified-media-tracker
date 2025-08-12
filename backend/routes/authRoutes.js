const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// register/login
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.me);
router.delete('/me', auth, authController.deleteAccount);

module.exports = router;
