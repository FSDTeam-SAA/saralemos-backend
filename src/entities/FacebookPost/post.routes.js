import express from 'express';

import {
  handleFinalizePost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostStatus,
  publishDraft
} from './post.controller.js';
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

/**
 * @route   GET /api/posts
 * @desc    Get all posts with filters (status, platform, postType)
 * @access  Private
 * @query   status - Filter by post status (DRAFT, SCHEDULED, PUBLISHED, FAILED)
 *          platform - Filter by platform (facebook, instagram)
 *          postType - Filter by type (TEXT_ONLY, SINGLE_IMAGE, CAROUSEL, VIDEO)
 *          page - Page number (default: 1)
 *          limit - Items per page (default: 20)
 */
router.get('/', verifyToken, userMiddleware, getAllPosts);

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Private
 */
router.get('/:id', verifyToken, userMiddleware, getPostById);

/**
 * @route   GET /api/posts/:id/status
 * @desc    Get real-time status of a post from Facebook/Instagram API
 * @access  Private
 */
router.get('/:id/status', verifyToken, userMiddleware, getPostStatus);

/**
 * @route   PUT /api/posts/:id
 * @desc    Update a draft or failed post
 * @access  Private
 * @body    Same as /finalize endpoint
 */
router.put(
  '/:id',
  verifyToken,
  userMiddleware,
  upload.array('postImages', 10),
  updatePost
);

/**
 * @route   POST /api/posts/:id/publish
 * @desc    Publish a draft post
 * @access  Private
 */
router.post('/:id/publish', verifyToken, userMiddleware, publishDraft);

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a draft or failed post
 * @access  Private
 */
router.delete('/:id', verifyToken, userMiddleware, deletePost);

export default router;
