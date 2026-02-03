import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    billingCycle: {
      type: String,
      default: 'monthly'
    },

    allowedListings: {
      type: Number,
      required: true,
      min: 0,
      default: 5
    },

    isActive: {
      type: Boolean,
      default: true
    },
    features: [
      {
        type: String
      }
    ]
  },
  { timestamps: true }
);

const SubscriptionPlan = mongoose.model(
  'SubscriptionPlan',
  subscriptionPlanSchema
);
export default SubscriptionPlan;
