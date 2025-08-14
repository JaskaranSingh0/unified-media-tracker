require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const listRoutes = require('./routes/listRoutes');
const discoverRoutes = require('./routes/discoverRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const recommendRoutes = require('./routes/recommendRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/auth', authRoutes);
app.use('/api/list', listRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recommend', recommendRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
