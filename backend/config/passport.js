const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({
        'socialProvider.id': profile.id,
        'socialProvider.type': 'google'
      });

      if (user) {
        return done(null, user);
      }

      // Create new user if doesn't exist
      user = new User({
        email: profile.emails[0].value,
        username: profile.displayName,
        socialProvider: {
          type: 'google',
          id: profile.id
        }
      });

      await user.save();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));
