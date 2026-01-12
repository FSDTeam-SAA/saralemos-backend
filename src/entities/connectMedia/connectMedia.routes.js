import express from 'express';
import { facebookCallback, getFacebookLoginUrl } from './connectMedia.controller.js';
import { userAdminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

// Step 1: Get login URL
router.get('/connect-user',verifyToken,userAdminMiddleware, getFacebookLoginUrl);

// Step 2: Facebook redirects here after login
router.get('/callback', facebookCallback);

export default router;
