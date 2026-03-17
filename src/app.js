import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import logger from './core/config/logger.js';
import errorHandler from './core/middlewares/errorMiddleware.js';
import notFound from './core/middlewares/notFound.js';
import { globalLimiter } from './lib/limit.js';
import appRouter from './core/app/appRouter.js';
import { startPaymentStatusCron } from './core/cron/paymentCron.js';
import {
  startPostStatusCron,
  startPostCleanupCron
} from './core/cron/postStatusCron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set up security middleware
app.use(helmet());

app.use(xssClean());
app.use(mongoSanitize());

// Set up logging middleware
app.use(morgan('combined'));
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://sara-lemos-client-dashboard-cyan.vercel.app',
  'https://saralemos1978-website-brown.vercel.app',
  'https://saralemos-admin-dasboard-seven.vercel.app'

];

app.use(
  cors, ({
    origin: (origin, cb) => {
      // allow non-browser requests (like Postman/curl) where origin is undefined
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// handle preflight for all routes with the same config
app.options(
  '*',
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
// Set up body parsing middleware
app.use(express.json({ limit: '10000kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up rate limiting middleware
app.use(globalLimiter);

// Set up static files middleware
const uploadPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadPath));

// Set up API routes
app.use('/api', appRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Set up 404 error middleware
app.use(notFound);

// Set up error handling middleware
app.use(errorHandler);

// Start cron jobs
startPaymentStatusCron();
startPostStatusCron();
startPostCleanupCron();

logger.info('Middleware stack initialized');

export { app };
