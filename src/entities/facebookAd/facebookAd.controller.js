import axios from 'axios';
import qs from 'querystring';
import User from '../auth/auth.model.js';
import FacebookAdSet from '../ManageAdd/adSet.model.js';
import facebookAdModel from '../facebookAd/facebookAd.model.js';
import FacebookAdCreative from '../ManageAdd/AdCreative.model.js';

const FB = (path) =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v17.0'}/${path}`;

export const publishAd = async (req, res) => {
  try {
    const userId = req.user._id;
    const { adCreativeId, adSetId, adAccountId, pageId } = req.body;

    if (!adCreativeId || !adSetId || !adAccountId || !pageId) {
      return res.status(400).json({
        error: 'adCreativeId, adSetId, adAccountId, and pageId are required',
      });
    }

    // Fetch Ad Set using _id but take numeric fbAdSetId for FB API
    const adSet = await FacebookAdSet.findById(adSetId);
    if (!adSet) return res.status(404).json({ error: 'Ad Set not found' });

    const fbAdSetId = adSet.fbAdSetId; // numeric ID

    // Fetch Ad Creative using _id but take numeric fbAdCreativeId for FB API
    const adCreative = await FacebookAdCreative.findById(adCreativeId);
    if (!adCreative) return res.status(404).json({ error: 'Ad Creative not found' });

    const fbAdCreativeId = adCreative.fbAdCreativeId; // numeric ID

    const adName = adSet.name; // Use Ad Set name as Ad name

    // Get page access token
    const user = await User.findById(userId);
    if (!user?.facebookBusinesses) {
      return res.status(400).json({ error: 'User has not connected Facebook' });
    }

    const page = user.facebookBusinesses
      .flatMap((b) => b.pages || [])
      .find((p) => p.pageId === pageId);

    if (!page?.pageAccessToken) {
      return res.status(400).json({
        error: 'Page access token not found. Ask user to reconnect Facebook or choose a different page.',
      });
    }

    const pageAccessToken = page.pageAccessToken;
    const actId = adAccountId.toString().startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Create Ad on Facebook
    const createAdRes = await axios.post(
      FB(`${actId}/ads`),
      qs.stringify({
        name: adName,
        adset_id: fbAdSetId,
        creative: JSON.stringify({ creative_id: fbAdCreativeId }),
        status: 'PAUSED',
      }),
      { params: { access_token: pageAccessToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const fbAdId = createAdRes.data.id;

    // Save into local DB
    const fbAd = new facebookAdModel({
      userId,
      adAccountId,
      page: { pageId, pageName: page.pageName },
      adSet: { fbAdSetId },
      adCreative: { fbAdCreativeId },
      fbAdId,
      name: adName,
      status: 'PAUSED',
      lastSyncedAt: new Date(),
    });

    await fbAd.save();

    return res.json({
      message: 'Ad successfully published (paused) on Facebook.',
      fbAdId,
      ad: fbAd,
    });
  } catch (err) {
    console.error('publishAdFinal error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to publish ad',
      detail: err.response?.data || err.message,
    });
  }
};
