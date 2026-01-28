import mongoose from 'mongoose';

const socialPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pageId: {
    type: String,
    required: true
  },
  listingName: {
    type: String
  },

  // --- CONTENT ---
  content: {
    message: { type: String, required: true },
    hashtags: [{ type: String }]
  },

  // --- MEDIA ---
  media: [
    {
      url: { type: String, required: true },
      mediaType: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' }
    }
  ],

  // --- CONFIG ---
  postType: {
    type: String,
    enum: ['TEXT_ONLY', 'SINGLE_IMAGE', 'CAROUSEL', 'VIDEO'],
    required: true
  },
  platforms: [
    {
      type: String,
      enum: ['facebook', 'instagram'],
      required: true
    }
  ],

  // --- STATUS ---
  // DRAFT: Saved in your DB, not sent to Meta
  // SCHEDULED: Sent to Meta with a future date (Meta will auto-post)
  // PUBLISHED: Sent to Meta for immediate posting
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'],
    default: 'DRAFT'
  },

  // This is only required if status becomes 'SCHEDULED'
  scheduledPublishTime: {
    type: Date
  },

  // --- TRACKING ---
  platformData: {
    facebook: {
      postId: String,
      status: {
        type: String,
        enum: ['SCHEDULED', 'PUBLISHED', 'ERROR', 'PENDING']
      },
      errorMessage: String,
      lastChecked: Date,
      isVerified: { type: Boolean, default: false }
    },
    instagram: {
      mediaId: String,
      status: {
        type: String,
        enum: ['SCHEDULED', 'PUBLISHED', 'ERROR', 'PENDING']
      },
      errorMessage: String,
      lastChecked: Date,
      isVerified: { type: Boolean, default: false }
    }
  },

  // --- STATUS VERIFICATION ---
  lastStatusCheck: { type: Date },
  statusCheckCount: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SocialPost = mongoose.model('SocialPost', socialPostSchema);
export default SocialPost;
