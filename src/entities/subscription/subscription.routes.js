import express from 'express';
import {
  createPlan,
  deletePlan,
  getPlanById,
  getPlans,
  updatePlan
} from './subscription.controller.js';
import {
  createPaymentCheckout,
  handleStripeWebhook,
  getPaymentDetails,
  getPaymentHistory,
  verifyPaymentStatus
} from './payment.controller.js';

const router = express.Router();

// Subscription Plan Routes
router.post('/create', createPlan);
router.get('/get-all', getPlans);
router.get('/:id', getPlanById);
router.put('/:id', updatePlan);
router.delete('/delete/:id', deletePlan);

// Payment Routes
router.post('/payment/create-checkout', createPaymentCheckout);
router.post(
  '/payment/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);
router.get('/payment/:sessionId', getPaymentDetails);
router.get('/payment/history/:userId', getPaymentHistory);
router.get('/payment/verify/:sessionId', verifyPaymentStatus);

export default router;
