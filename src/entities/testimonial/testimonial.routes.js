import express from 'express';
import {
  createTestimonialController,
  getAllTestimonialsController,
  getActiveTestimonialsController,
  getTestimonialByIdController,
  updateTestimonialController,
  deleteTestimonialController
} from './testimonial.controller.js';
import {
  adminMiddleware,
  verifyToken
} from '../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../core/middlewares/multer.js';

const router = express.Router();

// Public route - Get active testimonials
router.get('/active', getActiveTestimonialsController);

// Admin routes - CRUD operations
router.post(
  '/create',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: 'image', maxCount: 1 }]),
  createTestimonialController
);
router.get('/all', verifyToken, adminMiddleware, getAllTestimonialsController);
router.get('/:id', verifyToken, adminMiddleware, getTestimonialByIdController);
router.put(
  '/:id',
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: 'image', maxCount: 1 }]),
  updateTestimonialController
);
router.delete(
  '/:id',
  verifyToken,
  adminMiddleware,
  deleteTestimonialController
);

export default router;
