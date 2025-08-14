const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Local auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.me);
router.delete('/me', auth, authController.deleteAccount);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = authController.generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
  });

module.exports = router;
