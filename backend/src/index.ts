// Import config first - this handles environment validation and safe mode detection
import config, { SAFE_MODE } from './config/env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import courseRoutes from './routes/course.routes';
import testRoutes from './routes/test.routes';
import studentRoutes from './routes/student.routes';
import resultsRoutes from './routes/results.routes';
import materialsRoutes from './routes/materials.routes';
import notificationsRoutes from './routes/notifications.routes';
import settingsRoutes from './routes/settings.routes';

// Import queue system
import { closeQueues } from './queue';
import { startAllWorkers, stopAllWorkers } from './queue/workers';

const app = express();

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS — the frontend origin must exactly match (including protocol).
// In Railway deployments FRONTEND_URL (or legacy NEXT_PUBLIC_BASE_URL) should
// be set to the full frontend URL, e.g. https://my-app.railway.app
//
// When the Next.js server proxies /api/* requests to the backend the HTTP
// request originates from the Next.js server process, not from the browser.
// Node's `http` module does not set an `Origin` header on outbound requests,
// so `origin` arrives as `undefined`.  We explicitly allow that case because
// a request that arrives without an `Origin` header can only come from our own
// server-side proxy (browsers always set `Origin` on cross-origin requests).
//
// Railway production: hardcode the Railway frontend origin
const RAILWAY_FRONTEND_URL = 'https://edtech-production.up.railway.app';
const configuredFrontendUrl = config.frontendUrl || RAILWAY_FRONTEND_URL;
console.log('[CORS] Configured frontend origin:', configuredFrontendUrl ?? '(not set - server-to-server allowed)');
app.use(cors({
  origin: (origin, callback) => {
    // Allow undefined origins (server-to-server requests from Next.js proxy)
    // Browsers always send Origin on cross-origin requests, so undefined = internal
    if (!origin) {
      callback(null, true);
      return;
    }
    // Allow both configured frontend URL and Railway production URL
    if (origin === configuredFrontendUrl || origin === RAILWAY_FRONTEND_URL) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked request from unexpected origin:', origin);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Set-Cookie'],
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Prevent all API responses from being cached by browsers or CDNs.
// This eliminates 304 Not Modified responses that can serve stale auth state.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: config.nodeEnv,
    SAFE_MODE: SAFE_MODE,
  });
});

// General API rate limiter — protects all /api/* routes from excessive polling.
// Authenticated users behind a CDN share an IP, so the limit is intentionally
// generous (300 req / 1 min).  Tighter limits are applied per-route for
// sensitive operations (login, bulk upload, payment recording).
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',  // Health checks bypass rate limiting
  message: { error: 'Too many requests, please slow down and try again later' },
});
app.use('/api', generalApiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/student', studentRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: config.isProduction ? 'Something went wrong' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server only when not running under a test runner
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, () => {
    console.log(`\n🚀 Server running on port ${config.port}`);

    // Start queue workers if not in SAFE MODE and Redis is configured
    if (!SAFE_MODE && config.redisHost) {
      console.log('[Server] Starting queue workers...');
      startAllWorkers();
    } else if (SAFE_MODE) {
      console.log('[Server] Queue workers running in mock mode (SAFE MODE)');
    } else {
      console.log('[Server] Redis not configured, skipping queue workers');
    }
  });

  // Graceful shutdown
  async function gracefulShutdown(signal: string) {
    console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
      console.log('[Server] HTTP server closed');
    });

    // Stop queue workers
    if (!SAFE_MODE && config.redisHost) {
      await stopAllWorkers();
      await closeQueues();
    } else if (SAFE_MODE) {
      console.log('[Server] Closing mock queues...');
      await closeQueues();
    }

    console.log('[Server] Graceful shutdown complete');
    process.exit(0);
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;