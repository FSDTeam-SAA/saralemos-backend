import Stripe from 'stripe';
import { stripeSecretKey, clientUrl } from '../../core/config/config.js';
import Payment from './payment.model.js';
import User from '../auth/auth.model.js';
import SubscriptionPlan from './subscription.model.js';

const stripe = new Stripe(stripeSecretKey);

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = async (userId, planId) => {
  // Get user and plan details
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new Error('Invalid or inactive subscription plan');
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: `${plan.billingCycle} subscription`
          },
          unit_amount: Math.round(plan.price * 100) // Convert to cents
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/payment/cancel`,
    client_reference_id: userId.toString(),
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      billingCycle: plan.billingCycle
    }
  });

  // Create payment record
  const payment = await Payment.create({
    userId,
    subscriptionPlanId: planId,
    stripeSessionId: session.id,
    amount: plan.price,
    currency: 'usd',
    billingCycle: plan.billingCycle,
    paymentStatus: 'pending'
  });

  return {
    sessionId: session.id,
    url: session.url,
    payment
  };
};

/**
 * Calculate subscription expiry date based on billing cycle
 */
export const calculateExpiryDate = (billingCycle) => {
  const now = new Date();
  let expiryDate = new Date(now);

  switch (billingCycle.toLowerCase()) {
    case 'monthly':
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      break;
    case 'quarterly':
      expiryDate.setMonth(expiryDate.getMonth() + 3);
      break;
    case 'yearly':
    case 'annual':
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      break;
    case 'weekly':
      expiryDate.setDate(expiryDate.getDate() + 7);
      break;
    default:
      // Default to monthly if billing cycle is not recognized
      expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  return expiryDate;
};

/**
 * Handle successful payment
 */
export const handleSuccessfulPayment = async (session) => {
  try {
    const { userId, planId, billingCycle } = session.metadata;

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        stripePaymentIntentId: session.payment_intent,
        paymentStatus: 'completed'
      },
      { new: true }
    );

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Calculate expiry date
    const expiryDate = calculateExpiryDate(billingCycle);

    // Update user subscription status
    const user = await User.findByIdAndUpdate(
      userId,
      {
        hasActiveSubscription: true,
        subscriptionExpireDate: expiryDate
      },
      { new: true }
    );

    return { payment, user };
  } catch (error) {
    throw error;
  }
};

/**
 * Handle failed payment
 */
export const handleFailedPayment = async (session) => {
  try {
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        paymentStatus: 'failed'
      },
      { new: true }
    );

    return payment;
  } catch (error) {
    throw error;
  }
};

/**
 * Get payment by session ID
 */
export const getPaymentBySessionId = async (sessionId) => {
  try {
    const payment = await Payment.findOne({ stripeSessionId: sessionId })
      .populate('userId', 'firstName lastName email')
      .populate('subscriptionPlanId', 'name price billingCycle');

    return payment;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user payment history
 */
export const getUserPaymentHistory = async (userId) => {
  try {
    const payments = await Payment.find({ userId })
      .populate('subscriptionPlanId', 'name price billingCycle')
      .sort({ createdAt: -1 });

    return payments;
  } catch (error) {
    throw error;
  }
};
