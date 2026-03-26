require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const authRoutes = require('./routes/auth.js');
const adminRoutes = require('./routes/admin');
const appointmentRoutes = require('./routes/appointment');

// NEW ROUTES
// Handled at the bottom


const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://api.qrserver.com"],
      "connect-src": ["'self'", "http://*", "https://*", "ws://*", "wss://*"],
    },
  },
}));
app.use(express.json({ limit: '512kb' }));

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} origin=${req.headers.origin || 'none'}`
  );
  next();
});

// CORS
const isDev = process.env.NODE_ENV !== 'production' || FRONTEND_URL === '*';

if (isDev) {
  // Allow any origin in development to support localhost and various hospital network IPs
  app.use(
    cors({
      origin: true, 
      credentials: true,
    })
  );

  app.options('https://syp-backend.onrender.com/', cors());
} else {
  const allowedOrigins = FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`Blocked by CORS: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
}

// Rate limit
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Routes
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ai', require('./routes/ai'));

// NEW ROUTES
const doctorRoutes = require('./routes/doctor');
const patientRoutes = require('./routes/patient');
const notificationRoutes = require('./routes/notification');
const reportRoutes = require('./routes/report');
const billingRoutes = require('./routes/billing.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');

// Start server
const HOST = '0.0.0.0'; // Bind to all interfaces for network access
app.listen(PORT, HOST, () => {
  console.log(`HAMS backend running on http://${HOST}:${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
});

// attach new routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/ai', aiRoutes); // moved up

module.exports = app;