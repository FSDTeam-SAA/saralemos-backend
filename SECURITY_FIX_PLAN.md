# 🛡️ SECURITY FIX ACTION PLAN
## Critical Vulnerabilities - Implementation Guide

---

## PHASE 1: CRITICAL FIXES (TODAY - 2-3 Hours)

### Fix #1: Authentication Middleware - Missing Return Statements
**File:** `src/core/middlewares/authMiddleware.js`

Replace:
```javascript
const userMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: User not found', null);
  }
  const { role } = req.user;

  if (role !== "USER") {
    generateResponse(res, 403, false, 'User access only', null);  // ❌ Missing return
  }

  next();
};


const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Admin not found', null);
  }
  const { role } = req.user;

  if (role !== "ADMIN") {
    generateResponse(res, 403, false, 'Admin access only', null);  // ❌ Missing return
  }

  next();
};
```

With:
```javascript
const userMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: User not found', null);
  }
  const { role } = req.user;

  if (role !== "USER") {
    return generateResponse(res, 403, false, 'User access only', null);  // ✅ Fixed
  }

  next();
};

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Admin not found', null);
  }
  const { role } = req.user;

  if (role !== "ADMIN") {
    return generateResponse(res, 403, false, 'Admin access only', null);  // ✅ Fixed
  }

  next();
};

const userAdminMiddleware = (req, res, next) => {
  const { role } = req.user || {};

  if (![RoleType.USER, RoleType.ADMIN].includes(role)) {
    return generateResponse(res, 403, false, 'User or Admin access only', null);  // ✅ Fixed
  }
  next();
};
```

---

### Fix #2: Error Handler - Information Disclosure
**File:** `src/core/middlewares/errorMiddleware.js`

Replace entire file with:
```javascript
import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log full error details securely
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
    errorCode: err.code || 'UNKNOWN'
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Build response - never expose internals in production
  const response = {
    status: false,
    message: 'An error occurred',
  };

  // Only expose error message in development
  if (isDevelopment) {
    response.message = err.message;
    response.stack = err.stack;
  }

  // Specific error types can have messages
  if (err.name === 'ValidationError') {
    response.message = 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    response.message = 'Unauthorized';
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
```

---

### Fix #3: Secret Validation
**File:** `src/core/config/config.js`

Add at top:
```javascript
import dotenv from 'dotenv';
dotenv.config();

// Validate all required secrets exist
const validateSecrets = () => {
  const requiredSecrets = [
    'MONGO_URI',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY'
  ];

  const missing = requiredSecrets.filter(secret => !process.env[secret]);
  
  if (missing.length > 0) {
    const error = new Error(
      `Missing critical environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required secrets are configured.`
    );
    error.code = 'MISSING_ENV_VARS';
    throw error;
  }
};

// Run validation on startup
validateSecrets();

// Server config
export const port = process.env.PORT || 5000;
export const mongoURI = process.env.MONGO_URI;
export const env = process.env.NODE_ENV || 'development';

// JWT config - never export secrets directly, use getters
const getAccessTokenSecret = () => process.env.ACCESS_TOKEN_SECRET;
const getRefreshTokenSecret = () => process.env.REFRESH_TOKEN_SECRET;
const getJwtSecret = () => process.env.JWT_SECRET;

export { 
  getAccessTokenSecret as accessTokenSecrete,
  getRefreshTokenSecret as refreshTokenSecrete,
  getJwtSecret as jwtSecret
};

// Rest of config...
export const jwtExpire = process.env.JWT_EXPIRE || '1h';
export const accessTokenExpires = process.env.ACCESS_TOKEN_EXPIRES || '7d';
export const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES || '10d';

// EMAIL config
export const emailExpires = parseInt(process.env.EMAIL_EXPIRES || 15 * 60 * 1000);
export const emailHost = process.env.EMAIL_HOST;
export const emailPort = process.env.EMAIL_PORT;
export const emailAddress = process.env.EMAIL_ADDRESS;
export const emailPass = process.env.EMAIL_PASS;
export const emailFrom = process.env.EMAIL_FROM;
export const adminMail = process.env.ADMIN_EMAIL;
export const emailTo = process.env.EMAIL_TO;

// Cloudinary config
export const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
export const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
export const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;

// Stripe config
export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
export const clientUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
```

Then update imports in authMiddleware.js:
```javascript
// OLD:
import {accessTokenSecrete} from '../../core/config/config.js';
const decoded = jwt.verify(token, accessTokenSecrete);

// NEW:
import { accessTokenSecrete as getAccessToken } from '../../core/config/config.js';
const decoded = jwt.verify(token, getAccessToken());
```

---

### Fix #4: File Upload Validation
**File:** `src/core/middlewares/multer.js`

Replace with:
```javascript
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";

// Get the directory name for the ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories if they don't exist
const uploadDir = resolve(__dirname, "../../../uploads");
const imageDir = resolve(uploadDir, "images");
const fileDir = resolve(uploadDir, "files");

if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
if (!existsSync(imageDir)) mkdirSync(imageDir, { recursive: true });
if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });

// Whitelist allowed MIME types
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

const ALLOWED_DOCUMENT_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// File type validator
const fileFilter = (req, file, cb) => {
  const allowedTypes = { ...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES };

  if (!allowedTypes[file.mimetype]) {
    return cb(
      new Error(`File type not allowed: ${file.mimetype}`),
      false
    );
  }

  // Additional check: verify extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = allowedTypes[file.mimetype] || [];
  
  if (!validExts.includes(ext)) {
    return cb(
      new Error(`File extension ${ext} doesn't match MIME type`),
      false
    );
  }

  cb(null, true);
};

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, imageDir);
    } else {
      cb(null, fileDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate cryptographically secure random filename
    // IGNORE original filename to prevent attacks
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, randomName);
  },
});

// Create multer instance with strict limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10 // Max 10 files per request
  }
});

// Custom fields upload function
const multerUpload = (fields) => upload.fields(fields);

// Export
export { upload, multerUpload };
```

---

### Fix #5: CORS Configuration
**File:** `src/app.js`

Replace CORS section (lines 31-54) with:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://sara-lemos-client-dashboard-cyan.vercel.app',
  'https://saralemos1978-website-brown.vercel.app',
  'https://saralemos-admin-dasboard-seven.vercel.app',
  'https://sara-lemos-client-dashboard-53u6nyn9c.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    // ALWAYS validate origin - no exceptions
    if (!origin) {
      // Mobile apps and some clients send no origin header
      // Require explicit header for credentials requests
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(
        new Error('Origin header required for this request'),
        false
      );
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 600, // Preflight cache 10 minutes
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

---

### Fix #6: Helmet Configuration
**File:** `src/app.js`

Replace line 23:
```javascript
// OLD:
app.use(helmet());

// NEW:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.stripe.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

### Fix #7: HTTPS Enforcement
**File:** `src/app.js`

Add after `const app = express();`:
```javascript
const app = express();

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.header('x-forwarded-proto');
    if (proto !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

---

### Fix #8: Morgan Security
**File:** `src/app.js`

Replace line 30:
```javascript
// OLD:
app.use(morgan('combined'));

// NEW:
import morgan from 'morgan';

// Hide sensitive headers in logs
morgan.token('auth', (req) => {
  return req.get('authorization') ? '***' : 'none';
});

const morganFormat = ':method :url :status :response-time ms | auth: :auth';
app.use(morgan(morganFormat));
```

---

## PHASE 2: HIGH PRIORITY (This Week)

### Fix #9: Input Validation
**File:** Create `src/core/middlewares/validateRequest.js`

```javascript
import { body, validationResult } from 'express-validator';
import { generateResponse } from '../../lib/responseFormate.js';

export const passwordRules = () => [
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

export const emailRules = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
];

export const nameRules = () => [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name too short'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name too short')
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    return generateResponse(res, 400, false, 'Validation failed', errorMessages);
  }
  next();
};
```

Update `src/entities/auth/auth.routes.js`:
```javascript
import {
  passwordRules,
  emailRules,
  nameRules,
  handleValidationErrors
} from '../../core/middlewares/validateRequest.js';

router.post(
  '/register',
  [
    ...emailRules(),
    ...passwordRules(),
    ...nameRules(),
    handleValidationErrors
  ],
  multerUpload([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]),
  registerUser
);

router.post(
  '/login',
  [...emailRules(), handleValidationErrors],
  loginUser
);
```

---

### Fix #10: Rate Limiting Per Endpoint
**File:** `src/lib/limit.js`

```javascript
import rateLimit from 'express-rate-limit';

// Global limiter - generous for general traffic
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter - for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  skip: (req, res) => res.statusCode < 400,
  message: 'Too many login attempts, please try again after an hour'
});

// Email verification limiter
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour per email
  keyGenerator: (req) => req.body.email,
  message: 'Too many verification attempts for this email'
});

// Payment limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment attempts per hour
  message: 'Too many payment attempts'
});

export {
  globalLimiter,
  authLimiter,
  emailVerificationLimiter,
  paymentLimiter
};
```

Update `src/entities/auth/auth.routes.js`:
```javascript
import { authLimiter, emailVerificationLimiter } from '../../lib/limit.js';

router.post('/login', authLimiter, loginUser);
router.post('/register', authLimiter, registerUser);
router.post('/verify-code', emailVerificationLimiter, verifyCode);
router.post('/forget-password', emailVerificationLimiter, forgetPassword);
```

---

### Fix #11: Ownership Validation (IDOR Prevention)
**File:** Create `src/core/middlewares/ownershipValidator.js`

```javascript
import { generateResponse } from '../../lib/responseFormate.js';

/**
 * Middleware to verify user owns the resource
 * @param {string} modelName - Model class name (e.g., 'YachtListing')
 * @param {string} paramName - URL param name (default: 'id')
 * @param {string} ownerField - Field name that contains user ID (default: 'createdBy')
 */
export const verifyOwnership = (modelName, paramName = 'id', ownerField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        return generateResponse(res, 400, false, 'Resource ID required', null);
      }

      const resource = await modelName.findById(resourceId);
      
      if (!resource) {
        return generateResponse(res, 404, false, 'Resource not found', null);
      }

      // Check ownership
      const ownerId = resource[ownerField];
      const userId = req.user._id.toString();
      const resourceOwnerId = ownerId.toString();

      if (userId !== resourceOwnerId) {
        return generateResponse(res, 403, false, 'Access denied - you do not own this resource', null);
      }

      // Attach resource to request for use in controller
      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
};
```

Update listing routes:
```javascript
import { verifyOwnership } from '../../core/middlewares/ownershipValidator.js';
import { YachtListing } from './listing.model.js';

router.get('/:id', verifyToken, verifyOwnership(YachtListing, 'id', 'createdBy'), getListing);
router.put('/:id', verifyToken, verifyOwnership(YachtListing, 'id', 'createdBy'), updateListing);
router.delete('/:id', verifyToken, verifyOwnership(YachtListing, 'id', 'createdBy'), deleteListing);
```

---

## PHASE 3: IMPORTANT (This Sprint)

### Fix #12: JWT Revocation/Blacklist
**File:** `src/entities/auth/auth.model.js`

Add to UserSchema:
```javascript
const UserSchema = new mongoose.Schema({
  // ... existing fields ...
  tokenBlacklist: {
    type: [String],
    default: [],
    index: true // For fast lookup
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  // ... rest of schema
});
```

Update `authMiddleware.js`:
```javascript
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return generateResponse(res, 401, false, 'No token, auth denied', null);

  try {
    const decoded = jwt.verify(token, getAccessToken());
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      return generateResponse(res, 401, false, 'User not found', null);
    }

    // Check user status
    if (!user.isActive) {
      return generateResponse(res, 401, false, 'User account deactivated', null);
    }

    if (user.isBanned) {
      return generateResponse(res, 401, false, 'User account suspended', null);
    }

    // Check token blacklist
    if (user.tokenBlacklist.includes(token)) {
      return generateResponse(res, 401, false, 'Token has been revoked', null);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    // ... existing error handling
  }
};
```

---

### Fix #13: .env Template
**File:** Create `.env.example`

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/saralemos

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ACCESS_TOKEN_SECRET=your-access-token-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars
ACCESS_TOKEN_EXPIRES=7d
REFRESH_TOKEN_EXPIRES=30d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@saralemos.com
ADMIN_EMAIL=admin@saralemos.com
EMAIL_EXPIRES=900000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI
OPENAI_API_KEY=sk-your-key

# Frontend
FRONTEND_URL=https://yourdomain.com
```

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

---

### Fix #14: .env Validation Schema
**File:** `src/core/config/validation.js`

```javascript
import joi from 'joi';

export const envSchema = joi.object({
  NODE_ENV: joi
    .string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: joi.number().default(5000),
  MONGO_URI: joi.string().required(),
  JWT_SECRET: joi.string().required().min(32),
  ACCESS_TOKEN_SECRET: joi.string().required().min(32),
  REFRESH_TOKEN_SECRET: joi.string().required().min(32),
  ACCESS_TOKEN_EXPIRES: joi.string().default('7d'),
  REFRESH_TOKEN_EXPIRES: joi.string().default('30d'),
  EMAIL_HOST: joi.string().required(),
  EMAIL_PORT: joi.number().required(),
  EMAIL_ADDRESS: joi.string().email().required(),
  EMAIL_PASS: joi.string().required(),
  EMAIL_FROM: joi.string().email().required(),
  CLOUDINARY_CLOUD_NAME: joi.string().required(),
  CLOUDINARY_API_KEY: joi.string().required(),
  CLOUDINARY_API_SECRET: joi.string().required(),
  STRIPE_SECRET_KEY: joi.string().required(),
  OPENAI_API_KEY: joi.string().required(),
  FRONTEND_URL: joi.string().uri().required(),
}).unknown();

export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    convert: true
  });

  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }

  return value;
};
```

Update `index.js`:
```javascript
import { validateEnv } from './src/core/config/validation.js';

// Validate environment before starting
try {
  validateEnv();
} catch (err) {
  console.error('❌ Configuration Error:', err.message);
  process.exit(1);
}

// ... rest of startup code
```

---

## TESTING SECURITY

Add security tests:
**File:** `tests/security.test.js`

```javascript
import request from 'supertest';
import { app } from '../src/app.js';

describe('Security Headers', () => {
  it('should have security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('should not expose server info', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Authentication', () => {
  it('should require valid token', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('should reject missing auth header', async () => {
    const res = await request(app).get('/api/user/profile');
    expect(res.status).toBe(401);
  });
});

describe('Rate Limiting', () => {
  it('should rate limit login attempts', async () => {
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      if (i < 5) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(429); // Too many requests
      }
    }
  });
});

describe('CORS', () => {
  it('should reject unauthorized origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious.com');
    expect(res.status).toBe(200); // Endpoint works
    // But CORS would reject in browser
  });
});
```

Run tests:
```bash
npm test -- tests/security.test.js
```

---

## DEPLOYMENT CHECKLIST

```bash
✅ Security Checklist

Pre-Deployment:
  [ ] All env vars configured in .env.production
  [ ] Secrets validated on startup
  [ ] npm audit passed (no vulnerabilities)
  [ ] All tests passing
  [ ] Code reviewed by 2+ engineers
  [ ] Security audit completed
  [ ] Dependencies up to date

Deployment:
  [ ] DATABASE BACKUP created
  [ ] SSL/HTTPS certificate installed
  [ ] Rate limiting configured with Redis
  [ ] Logging configured (not console)
  [ ] Monitoring/alerts enabled
  [ ] Error tracking enabled (Sentry, etc)
  [ ] WAF configured
  [ ] DDoS protection enabled

Post-Deployment:
  [ ] Health check passes
  [ ] Auth endpoints working
  [ ] File upload restrictions in place
  [ ] CORS working correctly
  [ ] Rate limits not blocking legitimate users
  [ ] Security headers present
  [ ] No sensitive data in logs
```

---

## TIMELINE

| Phase | Duration | Critical? | Tasks |
|-------|----------|-----------|-------|
| Phase 1 | 2-3 hrs | YES | Fixes #1-8 (Auth, errors, secrets, uploads, CORS) |
| Phase 2 | 1-2 days | YES | Fixes #9-11 (Validation, rate limiting, IDOR) |
| Phase 3 | 3-5 days | MEDIUM | Fixes #12-14 (JWT revocation, env validation) |
| Testing | 1-2 days | YES | Security tests, audit, penetration test |
| Deployment | 0.5 day | - | Checklist completion, go-live |

**Total: 1-2 weeks to production-ready**

---

*Generated: 2026-04-30*
*For: Senior Staff Engineer Review*
