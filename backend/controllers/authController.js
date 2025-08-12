const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const genToken = (id) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
};

exports.register = async (req, res) => {
  try {
    const { email, password, socialProviderId } = req.body;
    if (!email && !socialProviderId) {
      return res.status(400).json({ error: 'Email or socialProviderId required' });
    }

    // social signup
    if (socialProviderId) {
      let user = await User.findOne({ socialProviderId });
      if (!user) {
        user = await User.create({ socialProviderId, email });
      }
      const token = genToken(user._id);
      return res.json({ token, user });
    }

    // email/password signup
    if (!password) return res.status(400).json({ error: 'Password required for email signup' });

    let exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    const token = genToken(user._id);
    return res.json({ token, user: { _id: user._id, email: user.email } });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, socialProviderId } = req.body;
    if (socialProviderId) {
      const user = await User.findOne({ socialProviderId });
      if (!user) return res.status(400).json({ error: 'Social user not found' });
      const token = genToken(user._id);
      return res.json({ token, user });
    }

    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = genToken(user._id);
    return res.json({ token, user: { _id: user._id, email: user.email } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.me = async (req, res) => {
  // req.user is set by auth middleware
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    // return user with tracked items
    const user = await User.findById(req.user._id).select('-password');
    return res.json({ user });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteAccount error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
