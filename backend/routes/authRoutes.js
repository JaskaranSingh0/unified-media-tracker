const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const passport = require('passport');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');

// Local auth routes
router.post('/register', checkSchema(registerSchema), validate, authController.register);
router.post('/login', checkSchema(loginSchema), validate, authController.login);
router.get('/me', auth, authController.me);
router.put('/me/password', auth, authController.updatePassword);
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
