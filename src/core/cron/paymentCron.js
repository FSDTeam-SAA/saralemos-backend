import cron from 'node-cron';
import Stripe from 'stripe';
import { stripeSecretKey } from '../config/config.js';
import Payment from '../../entities/subscription/payment.model.js';
import User from '../../entities/auth/auth.model.js';
import { calculateExpiryDate } from '../../entities/subscription/payment.service.js';
import logger from '../config/logger.js';

const stripe = new Stripe(stripeSecretKey);

/**
 * Check and update pending payments
 * Runs every 5 seconds to check Stripe session status
 */
export const startPaymentStatusCron = () => {
  // Run every 5 seconds
  cron.schedule('*/5 * * * * *', async () => {
    try {
      logger.info('Running payment status check cron job...');

      // Find all pending payments
      const pendingPayments = await Payment.find({
        paymentStatus: 'pending'
      }).limit(50); // Process in batches

      if (pendingPayments.length === 0) {
        logger.info('No pending payments to process');
        return;
      }

      logger.info(`Found ${pendingPayments.length} pending payments to check`);

      for (const payment of pendingPayments) {
        try {
          // Retrieve session from Stripe
          const session = await stripe.checkout.sessions.retrieve(
            payment.stripeSessionId
          );

          // Check if payment was completed
          if (session.payment_status === 'paid') {
            logger.info(`Payment ${payment.stripeSessionId} is completed`);

            // Update payment record
            payment.stripePaymentIntentId = session.payment_intent;
            payment.paymentStatus = 'completed';
            await payment.save();

            // Calculate expiry date
            const expiryDate = calculateExpiryDate(payment.billingCycle);

            // Update user subscription status
            await User.findByIdAndUpdate(payment.userId, {
              hasActiveSubscription: true,
              subscriptionExpireDate: expiryDate
            });

            logger.info(
              `Successfully updated payment and subscription for user ${payment.userId}`
            );
          } else if (session.status === 'expired') {
            // Mark payment as failed if session expired
            payment.paymentStatus = 'failed';
            await payment.save();
            logger.info(`Payment ${payment.stripeSessionId} expired`);
          }
        } catch (error) {
          logger.error(
            `Error processing payment ${payment.stripeSessionId}:`,
            error.message
          );
          // Continue with next payment
          continue;
        }
      }

      logger.info('Payment status check completed');
    } catch (error) {
      logger.error('Payment cron job error:', error);
    }
  });

  logger.info('Payment status cron job initialized (runs every 5 seconds)');
};
