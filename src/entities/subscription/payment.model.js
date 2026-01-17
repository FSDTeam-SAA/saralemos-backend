import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'usd'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    billingCycle: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      default: 'stripe'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
