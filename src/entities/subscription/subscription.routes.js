import express from 'express';
import {
  createPlan,
  deletePlan,
  getPlanById,
  getPlans,
  getPlanFeatures,
  updatePlan
} from './subscription.controller.js';
import {
  createPaymentCheckout,
  getPaymentDetails,
  getPaymentHistory,
  verifyPaymentStatus
} from './payment.controller.js';
import {
  getDashboardOverview,
  getPaymentMetrics,
  getPlanAnalytics
} from './analytics.controller.js';

const router = express.Router();

// Dashboard Analytics Route
router.get('/metrics', getPaymentMetrics);
router.get('/dashboard/overview', getDashboardOverview);

router.get('/plan/:planId', getPlanAnalytics);

// Subscription Plan Routes (specific routes before parameterized routes)
router.post('/create', createPlan);
router.get('/get-all', getPlans);
router.get('/features', getPlanFeatures);
router.delete('/delete/:id', deletePlan);
router.get('/:id', getPlanById);
router.put('/:id', updatePlan);

// Payment Routes
router.post('/payment/create-checkout', createPaymentCheckout);
router.get('/payment/:sessionId', getPaymentDetails);
router.get('/payment/history/:userId', getPaymentHistory);
router.get('/payment/verify/:sessionId', verifyPaymentStatus);

export default router;
