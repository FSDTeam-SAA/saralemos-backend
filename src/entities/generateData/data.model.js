import mongoose from 'mongoose';

const AdSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Who created the ad
  page: {
    pageId: { type: String,  },
    pageName: { type: String,  },
    pageAccessToken: { type: String,  },
    instagramBusinessId: { type: String } // optional
  },
  // ---------- Campaign Info ----------
  campaign: {
    name: { type: String, required: true },
    objective: { type: String, required: true } ,
     fbCampaignId: {type:String}       
  },

  // ---------- Ad Set ----------
  adSet: {
    name: { type: String, required: true },
    dailyBudget: { type: Number, required: true },      
    endDate: { type: Date, required: true },
    targeting: {
      locations: [{ type: String, required: true }],  
      ageMin: { type: Number, required: true },
      ageMax: { type: Number, required: true },
      gender: { type: Number, required: true }        
    },
    fbAdSetId:{type:String}
  },

  // ---------- Ad Creative ----------
  adCreative: {
    name: { type: String, required: true },
    format: { type: String, required: true },         
    mediaUrls: [{ type: String, required: true }],   
    primaryText: { type: String, required: true },
    headline: { type: String, required: true },
    destinationUrl: { type: String, required: true },
    fbAdCreativeId:{type:String}   
  }

}, { timestamps: true });

const Ad = mongoose.models.Ad || mongoose.model('Ad', AdSchema);
export default Ad;
