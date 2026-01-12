import mongoose from 'mongoose';

const facebookAdCreativeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adAccountId: { type: String, required: true },
  adSet: { type: mongoose.Schema.Types.ObjectId, ref: 'FacebookAdSet', required: true },

  name: { type: String, required: true },
  fbAdCreativeId: { type: String }, // returned by Facebook

  format: { type: String, enum: ['SINGLE_IMAGE', 'VIDEO'], default: 'SINGLE_IMAGE' },

  headline: { type: String },
  primaryText: { type: String },
  destinationUrl: { type: String },

  mediaUrls: [String], // original URLs uploaded by user
  imageHashes: [String], // returned by Facebook if images
  videoId: { type: String }, // returned by Facebook if video

  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'PAUSED', 'DELETED'], default: 'DRAFT' },

  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('FacebookAdCreative', facebookAdCreativeSchema);
