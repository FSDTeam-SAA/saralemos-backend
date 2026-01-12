import mongoose from 'mongoose';

const facebookCampaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adAccountId: { type: String, required: true },
  page: { pageId: String, pageName: String },

  name: { type: String, required: true },

  
  objective: { 
    type: String, 
    enum: ['OUTCOME_LEADS', 'OUTCOME_AWARENESS'], 
    required: true 
  },

  fbCampaignId: { type: String }, // returned by Facebook
  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'DELETED'], default: 'PAUSED' },

  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('FacebookCampaign', facebookCampaignSchema);
