import mongoose from 'mongoose';

const facebookAdSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    adAccountId: {
      type: String,
      required: true,
    },

    page: {
      pageId: String,
      pageName: String,
    },

    campaign: {
      name: String,
      objective: String,
      fbCampaignId: String,
      status: {
        type: String,
        enum: ['ACTIVE', 'PAUSED', 'DELETED'],
        default: 'PAUSED',
      },
    },

    adSet: {
      name: String,
      fbAdSetId: String,
      dailyBudget: Number,
      startDate: Date,
      endDate: Date,
      targeting: {
        locations: [String],
        ageMin: Number,
        ageMax: Number,
        gender: Number, // 1 = male, 2 = female (as per FB API)
      },
    },

    adCreative: {
      name: String,
      fbAdCreativeId: String,
      headline: String,
      primaryText: String,
      destinationUrl: String,
      mediaUrls: [String],
    },

    fbAdId: {
      type: String,
    },

    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'PAUSED', 'DELETED'],
      default: 'DRAFT',
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('FacebookAd', facebookAdSchema);
