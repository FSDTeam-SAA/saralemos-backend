# 🔐 SECURITY AUDIT REPORT
**Senior Staff Engineer Analysis** | Severity Levels: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

## EXECUTIVE SUMMARY
The codebase has a **solid security foundation** with good defensive measures, but contains **several critical vulnerabilities** that need immediate remediation. The project is **NOT production-ready** without fixes.

**Risk Level: HIGH** ⚠️
- 4 CRITICAL issues
- 6 HIGH issues  
- 8 MEDIUM issues
- 5 LOW issues

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### 1. **EXPOSED SECRETS IN CODE** ⚠️ HIGH IMPACT
**Location:** `src/core/config/config.js`
**Issue:** 
```javascript
export const accessTokenSecrete = process.env.ACCESS_TOKEN_SECRET;
export const refreshTokenSecrete = process.env.REFRESH_TOKEN_SECRET;
export const jwtSecret = process.env.JWT_SECRET;
```
- Secrets exported as module exports (can be leaked via node_modules or stack traces)
- No validation if env vars are actually set
- Environment file likely committed to git

**Risk:** Token forgery, session hijacking, full application compromise

**Fix:**
```javascript
// Validate secrets exist
export const validateSecrets = () => {
  const requiredSecrets = [
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'JWT_SECRET',
    'MONGO_URI'
  ];
  
  const missing = requiredSecrets.filter(secret => !process.env[secret]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
};

// DO NOT export secrets as variables - use functions
const getSecret = (name) => {
  const secret = process.env[name];
  if (!secret) throw new Error(`${name} not configured`);
  return secret;
};
```

---

### 2. **AUTHENTICATION MIDDLEWARE MISSING RETURN STATEMENTS** 🔴
**Location:** `src/core/middlewares/authMiddleware.js` (Lines 35-54)
```javascript
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Admin not found', null);
  }
  const { role } = req.user;

  if (role !== "ADMIN") {
    generateResponse(res, 403, false, 'Admin access only', null);  // ❌ NO RETURN!
  }
  next();  // ❌ STILL EXECUTES EVEN AFTER ERROR!
};
```

**Issue:** Missing `return` before `generateResponse` allows execution to continue to `next()`

**Impact:** 
- Unauthorized users can bypass role-based access control
- Admin endpoints accessible to regular users
- ALL permission checks have this bug

**Fix:**
```javascript
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return generateResponse(res, 401, false, 'Unauthorized: Admin not found', null);
  }
  const { role } = req.user;

  if (role !== "ADMIN") {
    return generateResponse(res, 403, false, 'Admin access only', null);  // ✅ ADD RETURN
  }
  next();
};

const userAdminMiddleware = (req, res, next) => {
  const { role } = req.user || {};

  if (![RoleType.USER, RoleType.ADMIN].includes(role)) {
    return generateResponse(res, 403, false, 'User or Admin access only', null);  // ✅ ADD RETURN
  }
  next();
};
```

---

### 3. **UNVALIDATED FILE UPLOADS** 🔴
**Location:** `src/core/middlewares/multer.js`
```javascript
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    const randomName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + randomName + "-" + file.originalname);  // ❌ DANGEROUS
  },
});
```

**Issues:**
1. **No MIME type validation** - accepts ANY file type
2. **No file size limits** in middleware
3. **Original filename preserved** - could contain special characters
4. **Files served statically** - arbitrary file execution possible
5. **Path traversal vulnerability** - `../../../` in filename could escape upload directory

**Impact:** RCE, arbitrary file upload, DoS via large files, information disclosure

**Fix:**
```javascript
import path from 'path';
import crypto from 'crypto';

const fileFilter = (req, file, cb) => {
  // Whitelist allowed MIME types
  const allowedMimes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf']
  };

  if (!allowedMimes[file.mimetype]) {
    return cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }

  cb(null, true);
};

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    // Generate random name, ignore original filename
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, randomName);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max
    files: 10  // Max 10 files per request
  }
});
```

---

### 4. **INSUFFICIENT ERROR HANDLING - INFORMATION DISCLOSURE** 🔴
**Location:** `src/core/middlewares/errorMiddleware.js`
```javascript
const errorHandler = (err, req, res, next) => {
    console.error(err);  // ❌ Logs full stack trace
    return res.status(500).json({ 
        status: false, 
        message: 'Internal Server Error', 
        error: err.message  // ❌ EXPOSES INTERNAL DETAILS
    });
};
```

**Issues:**
1. **Stack traces logged to console** in production
2. **Error messages exposed to client** - reveals database errors, API structure
3. **No distinction** between dev/prod environments
4. **No error tracking** - can't debug production issues

**Impact:** Information disclosure, attackers learn system internals

**Fix:**
```javascript
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log to file/monitoring service, NOT console
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    timestamp: new Date()
  });

  // Don't expose internal details
  const clientResponse = {
    status: false,
    message: isDevelopment ? err.message : 'An error occurred',
  };

  if (isDevelopment) {
    clientResponse.error = err.message;
  }

  return res.status(err.status || 500).json(clientResponse);
};
```

---

## 🟠 HIGH SEVERITY ISSUES

### 5. **JWT VALIDATION INCOMPLETE** 🟠
**Location:** `src/core/middlewares/authMiddleware.js` (Lines 5-20)
```javascript
const decoded = jwt.verify(token, accessTokenSecrete);
const user = await User.findById(decoded._id).select('-password...');
```

**Issues:**
- No check if user is DELETED after token generation
- No check if user is BANNED/SUSPENDED
- No check if token is revoked/blacklisted
- Token can be valid forever if user account still exists

**Fix:**
```javascript
export const verifyToken = async (req, res, next) => {
  try {
    const decoded = jwt.verify(token, accessTokenSecrete);
    const user = await User.findById(decoded._id);
    
    if (!user) {
      return generateResponse(res, 401, false, 'User not found', null);
    }
    
    // NEW: Check user status
    if (user.isDeleted) {
      return generateResponse(res, 401, false, 'User account deleted', null);
    }
    if (user.isBanned) {
      return generateResponse(res, 401, false, 'User account suspended', null);
    }
    if (user.tokenBlacklist?.includes(token)) {
      return generateResponse(res, 401, false, 'Token revoked', null);
    }
    
    req.user = user;
    next();
  } catch (err) {
    // ... existing error handling
  }
};
```

---

### 6. **PASSWORD STORAGE - NO HASHING VISIBLE** 🟠
**Location:** `src/entities/auth/auth.service.js` (Line 33)
```javascript
const newUser = new User({
    password,  // ❌ Stored as-is, assuming model hooks hash it
    // ...
});
```

**Issue:** Code relies on implicit password hashing in model (not shown). If model hook fails, passwords stored in plaintext.

**Fix:** Validate model has pre-save hook:
```javascript
// In auth.model.js - VERIFY THIS EXISTS:
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};
```

---

### 7. **CORS MISCONFIGURATION** 🟠
**Location:** `src/app.js` (Lines 31-41)
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);  // ❌ ALLOWS NO-ORIGIN REQUESTS
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  // ...
};
```

**Issues:**
1. `if (!origin) return callback(null, true)` - Allows any client without origin header
2. No protection against subdomain takeover
3. `credentials: true` with wildcard-permissive origin = CSRF risk

**Fix:**
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // ALWAYS validate origin, no exceptions
    if (!origin) {
      return callback(new Error('Origin header required'), false);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600  // Preflight cache 10 minutes
};
```

---

### 8. **RATE LIMITING INSUFFICIENT** 🟠
**Location:** `src/lib/limit.js`
```javascript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,  // 100 requests per 15 min = 400 req/hour
});
```

**Issues:**
1. Rate limit too high (100 per 15 min allows 6,400 requests/day)
2. Single limiter for ALL endpoints (should be stricter for auth)
3. No store configured (defaults to memory - doesn't scale across servers)
4. Email verification limiter exists but not used everywhere

**Fix:**
```javascript
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 requests per 15 min for sensitive endpoints
  message: 'Too many attempts, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,  // 5 login attempts per hour
  skipSuccessfulRequests: true,  // Don't count successful logins
});

export { strictLimiter, authLimiter };
```

---

### 9. **INSECURE DIRECT OBJECT REFERENCES (IDOR)** 🟠
**Location:** Typical pattern in all routes
```javascript
// Example from listing routes - likely vulnerable
router.get('/listing/:id', verifyToken, getListing);  // ❌ No ownership check
```

**Issue:** Routes verify user is authenticated but don't verify user OWNS the resource

**Fix:**
```javascript
const getListing = async (req, res) => {
  try {
    const listing = await YachtListing.findById(req.params.id);
    
    if (!listing) return res.status(404).json({ message: 'Not found' });
    
    // ✅ VERIFY OWNERSHIP
    if (listing.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(listing);
  } catch (err) {
    // ...
  }
};
```

---

### 10. **MISSING HELMET CONFIGURATION** 🟠
**Location:** `src/app.js` (Line 23)
```javascript
app.use(helmet());  // Using default config
```

**Issue:** Default Helmet is good but missing important protections:
- No HSTS (HTTPS enforcement)
- No CSP (XSS protection)
- No rate limit on HEAD requests

**Fix:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 11. **SQL INJECTION EQUIVALENT - NoSQL INJECTION** 🟡
**Location:** Database queries throughout
```javascript
const user = await User.findOne({ email });  // ✅ Safe
// But custom queries might be vulnerable:
User.find({ $where: req.query.filter })  // ❌ DANGEROUS if used
```

**Fix:** Always use mongoose query builder, sanitize regex:
```javascript
// ❌ DON'T:
User.find({ name: { $regex: req.query.search } })

// ✅ DO:
const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
User.find({ name: { $regex: escapedSearch, $options: 'i' } })
```

---

### 12. **SENSITIVE DATA IN LOGS** 🟡
**Location:** `src/app.js` (Line 30)
```javascript
app.use(morgan('combined'));  // Logs everything including headers
```

**Issue:** Morgan logs Authorization headers, tokens, sensitive data to console

**Fix:**
```javascript
import morgan from 'morgan';

morgan.token('auth', (req) => {
  return req.headers.authorization ? '***' : 'none';
});

app.use(morgan(':method :url :status :response-time ms - auth: :auth'));
```

---

### 13. **DATABASE PASSWORD IN LOGS** 🟡
**Location:** `index.js`
```javascript
mongoose.connect(mongoURI)  // mongoURI contains password
  .then(() => {
    logger.info('MongoDB connected');  // ❌ URI might be logged
  })
```

**Fix:**
```javascript
mongoose.connect(mongoURI)
  .then(() => {
    const safeUri = mongoURI.replace(/:[^:@]+@/, ':***@');
    logger.info(`MongoDB connected to ${safeUri}`);
  })
```

---

### 14. **NO INPUT VALIDATION** 🟡
**Location:** Most routes lack validation
```javascript
router.post('/register', multerUpload([...]), registerUser);
// ❌ No validation of email format, password strength, etc.
```

**Fix:** Use express-validator (already installed):
```javascript
import { body, validationResult } from 'express-validator';

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 12 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
      // Must contain: lowercase, uppercase, number, special char
    body('firstName').trim().isLength({ min: 2 }),
    body('lastName').trim().isLength({ min: 2 }),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  registerUser
);
```

---

### 15. **NO HTTPS ENFORCEMENT** 🟡
**Location:** Missing in production config
```javascript
// No redirect from HTTP to HTTPS
```

**Fix:**
```javascript
// In app.js - before other middleware
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### 16. **FILE UPLOAD PATH TRAVERSAL** 🟡
**Location:** `src/app.js` (Line 61)
```javascript
app.use('/uploads', express.static(uploadPath));
```

**Issue:** 
1. All files in uploads are publicly accessible
2. No sanitization of file paths
3. Should use `sendFile` with validation

**Fix:**
```javascript
app.get('/uploads/:filename', (req, res) => {
  // Prevent path traversal
  const filename = path.basename(req.params.filename);
  const filepath = path.join(uploadPath, filename);
  
  // Verify file is in upload directory
  if (!filepath.startsWith(uploadPath)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  res.sendFile(filepath);
});

// Remove static serving of uploads
// app.use('/uploads', express.static(uploadPath));  // ❌ DELETE THIS
```

---

### 17. **API KEY EXPOSURE IN REQUESTS** 🟡
**Location:** Throughout API calls (OpenAI, Stripe, Cloudinary)
```javascript
// In gptMathc.js
headers: {
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,  // ❌ In logs!
}
```

**Issue:** API keys can appear in:
- Request logs
- Error messages  
- Stack traces
- Network proxies

**Fix:**
```javascript
// Never log Authorization headers
morgan.token('auth', () => '***');

// Handle API errors securely
try {
  const res = await fetch(url, options);
} catch (err) {
  logger.error({
    message: err.message,
    // ❌ DON'T log: err.config, which contains headers
    endpoint: 'openai',
    status: err.response?.status
  });
}
```

---

### 18. **MISSING HELMET CSP** 🟡
**Location:** `src/app.js`
```javascript
app.use(helmet());  // Default config - no CSP
```

**Issue:** No Content Security Policy to prevent XSS injection

**Fix:** See issue #10 above

---

## 🟢 LOW PRIORITY ISSUES

### 19. **HARDCODED VALUES** 🟢
**Location:** `src/entities/auth/auth.routes.js`
```javascript
multerUpload([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
])
```

**Fix:** Centralize in config
```javascript
// src/core/config/uploadConfig.js
export const ALLOWED_IMAGE_FIELDS = [
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
];
```

---

### 20. **NO DEPENDENCY AUDIT** 🟢
**Issue:** Package.json has many dependencies, some may have CVEs

**Fix:**
```bash
npm audit
npm audit fix
npm install --save-dev npm-audit-resolver
```

Add to pre-commit hook:
```bash
#!/bin/bash
npm audit --audit-level=moderate || exit 1
```

---

### 21. **MISSING ENVIRONMENT VALIDATION** 🟢
**Location:** `src/core/config/config.js`
```javascript
export const port = process.env.PORT || 5000;  // ❌ No validation
```

**Fix:**
```javascript
import joi from 'joi';

const schema = joi.object({
  NODE_ENV: joi.string().required().valid('development', 'production'),
  PORT: joi.number().required(),
  MONGO_URI: joi.string().required(),
  JWT_SECRET: joi.string().required(),
  // ... all required vars
}).unknown();

const { error, value } = schema.validate(process.env);
if (error) throw new Error(`Config validation error: ${error.message}`);

export const config = value;
```

---

### 22. **NO RATE LIMIT RESET** 🟢
**Location:** `src/lib/limit.js`
```javascript
const globalLimiter = rateLimit({
  // No store - resets on server restart
});
```

**Issue:** Memory-based store loses data on crash

**Fix:** Use Redis (see issue #8)

---

### 23. **MISSING SECURITY HEADERS TEST** 🟢
Add to test suite:
```javascript
describe('Security Headers', () => {
  it('should set security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});
```

---

## PRIORITY FIX ORDER

### Phase 1 (IMMEDIATE - Do Today) ⚠️
1. Fix authentication middleware return statements (#2)
2. Add secret validation (#1)
3. Add file upload validation (#3)
4. Fix error handler (#4)

### Phase 2 (This Week) 🔴
5. Add CORS origin validation (#7)
6. Implement input validation (#14)
7. Add rate limiting per endpoint (#8)

### Phase 3 (This Sprint) 🟠
8. Add ownership checks (#9)
9. Implement JWT revocation (#5)
10. Add helmet CSP (#10)

---

## RECOMMENDED SECURITY TOOLS

```json
{
  "devDependencies": {
    "npm-audit": "latest",
    "snyk": "latest",
    "eslint-plugin-security": "latest",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.0"
  }
}
```

Add pre-commit hooks:
```bash
husky install
npx husky add .husky/pre-commit "npm run lint && npm run security-check"
```

---

## TESTING SECURITY

```bash
# Run security checks
npm audit
npx snyk test

# Add OWASP ZAP scanning
# Add dependency checking
npm outdated

# Test endpoints
npm run test:security
```

---

## DEPLOYMENT CHECKLIST

- [ ] All env vars validated
- [ ] Rate limiting configured with Redis
- [ ] HTTPS enforced
- [ ] Security headers tested
- [ ] File upload restrictions in place
- [ ] Error handling doesn't leak info
- [ ] No hardcoded secrets
- [ ] Logging doesn't expose sensitive data
- [ ] Database backups configured
- [ ] Monitoring/alerting set up

---

## CONCLUSION

**Current Status:** ⚠️ NOT PRODUCTION READY

**Estimated Remediation Time:**
- Phase 1: 2-3 hours
- Phase 2: 1-2 days
- Phase 3: 3-5 days

**Post-Fix Recommendation:**
- Third-party security audit
- Penetration testing
- Code review by security team

---

*Report Generated: 2026-04-30*
*Auditor: Senior Staff Engineer*
