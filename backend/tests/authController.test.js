const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authController = require('../controllers/authController');

const app = express();
app.use(express.json());

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.get('/auth/me', authController.authenticateToken, authController.me);

describe('Auth Controller', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      // Register first user
      await request(app).post('/auth/register').send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/auth/register')
        .send({ ...userData, username: 'different' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    test('should hash the password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      await request(app).post('/auth/register').send(userData);

      const user = await User.findOne({ email: userData.email });
      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hashes are much longer
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    test('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'testsecret');
      expect(decoded.id).toBeDefined();
    });
  });

  describe('GET /auth/me', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const user = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword'
      });
      userId = user._id;
      token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'testsecret');
    });

    test('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.username).toBe('testuser');
      expect(response.body.password).toBeUndefined();
    });

    test('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(403);
    });

    test('should return error with no token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return error with malformed authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });
  });
});
