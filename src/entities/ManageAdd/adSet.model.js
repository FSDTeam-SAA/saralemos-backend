import mongoose from 'mongoose';

const facebookAdSetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adAccountId: { type: String, required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'FacebookCampaign' },


  name: { type: String, required: true },
  fbAdSetId: { type: String },
  dailyBudget: { type: Number, required: true },
  startDate: { type: Date },
  endDate: { type: Date },

  targeting: {
    locations: [String],
    ageMin: Number,
    ageMax: Number,
    gender: Number, // 1 = male, 2 = female
  },

  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'DELETED'], default: 'PAUSED' },
  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('FacebookAdSet', facebookAdSetSchema);
