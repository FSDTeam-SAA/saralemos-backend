import Stripe from 'stripe';
import {
  stripeSecretKey,
  stripeWebhookSecret
} from '../../core/config/config.js';
import {
  createCheckoutSession,
  handleSuccessfulPayment,
  handleFailedPayment,
  getPaymentBySessionId,
  getUserPaymentHistory
} from './payment.service.js';

const stripe = new Stripe(stripeSecretKey);

/**
 * Create payment checkout session
 * POST /api/subscription/payment/create-checkout
 */
export const createPaymentCheckout = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user?.id || req.body.userId; // Assuming auth middleware sets req.user

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const result = await createCheckoutSession(userId, planId);

    res.status(200).json({
      success: true,
      message: 'Checkout session created successfully',
      data: {
        sessionId: result.sessionId,
        url: result.url,
        paymentId: result.payment._id
      }
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

/**
 * Stripe webhook handler
 * POST /api/subscription/payment/webhook
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Construct the event using the raw body and signature
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Payment successful:', session.id);
        await handleSuccessfulPayment(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log('Payment session expired:', session.id);
        await handleFailedPayment(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook handler failed'
    });
  }
};

/**
 * Get payment details by session ID
 * GET /api/subscription/payment/:sessionId
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const payment = await getPaymentBySessionId(sessionId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment details'
    });
  }
};

/**
 * Get user's payment history
 * GET /api/subscription/payment/history/:userId
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id; // From auth middleware

    // Ensure user can only view their own payment history (or admin)
    if (requestUserId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this payment history'
      });
    }

    const payments = await getUserPaymentHistory(userId);

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment history'
    });
  }
};

/**
 * Verify payment status
 * GET /api/subscription/payment/verify/:sessionId
 */
export const verifyPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const payment = await getPaymentBySessionId(sessionId);

    res.status(200).json({
      success: true,
      data: {
        paymentStatus: session.payment_status,
        status: session.status,
        payment
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};
