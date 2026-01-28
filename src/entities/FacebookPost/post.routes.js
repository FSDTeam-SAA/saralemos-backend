import express from 'express';

import { handleFinalizePost } from './post.controller.js';
import {
  userMiddleware,
  verifyToken
} from '../../core/middlewares/authMiddleware.js';
import { upload } from '../../core/middlewares/multer.js';

const router = express.Router();

/**
 * @route   POST /api/posts/finalize
 * @desc    Handle saving a draft, immediate posting, or scheduling
 * @access  Private
 * @body    postImages (files) - optional multiple image files to upload to Cloudinary
 *          mediaUrls (array) - optional direct media URLs
 *          Either provide postImages OR mediaUrls OR leave empty
 */
router.post(
  '/finalize',
  verifyToken,
  userMiddleware,
  upload.array('postImages', 10),
  handleFinalizePost
);

export default router;
