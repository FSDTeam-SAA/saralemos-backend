import axios from 'axios';
import qs from 'querystring';

import FacebookCampaign from '../ManageAdd/campaign.Model.js'
import User from '../auth/auth.model.js';

const FB = (path) =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v17.0'}/${path}`;

/**
 * Create a Facebook Campaign
 * Input: userId from auth, body: { adAccountId, pageId, name, objective }
 * Returns: saved FacebookCampaign document with fbCampaignId
 */
export const createCampaign = async (req, res) => {
  try {
    const userId = req.user.id;
    const { adAccountId, pageId, name, objective } = req.body;

    if (!adAccountId || !pageId || !name || !objective) {
      return res.status(400).json({
        error: 'adAccountId, pageId, name, and objective are required',
      });
    }

    // Validate objective (only allow Awareness or Leads)
    const ALLOWED_OBJECTIVES = ['OUTCOME_LEADS', 'OUTCOME_AWARENESS'];
    if (!ALLOWED_OBJECTIVES.includes(objective)) {
      return res.status(400).json({
        error: `Invalid objective. Allowed values: ${ALLOWED_OBJECTIVES.join(', ')}`,
      });
    }

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
        error: 'Page access token not found. Ask user to reconnect Facebook.',
      });
    }

    const pageAccessToken = page.pageAccessToken;
    const actId = adAccountId.toString().startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Create Campaign on Facebook (paused by default)
    const createCampaignRes = await axios.post(
      FB(`${actId}/campaigns`),
      qs.stringify({
        name,
        objective,
        status: 'PAUSED',
        "is_adset_budget_sharing_enabled":false,
        special_ad_categories: JSON.stringify(["NONE"])
      }),
      {
        params: { access_token: pageAccessToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const fbCampaignId = createCampaignRes.data.id;
    if (!fbCampaignId) {
      return res.status(500).json({ error: 'Failed to create campaign on Facebook' });
    }

    // Save campaign in MongoDB
    const campaign = new FacebookCampaign({
      userId,
      adAccountId,
      page: { pageId, pageName: page.pageName },
      name,
      objective,
      fbCampaignId,
      status: 'PAUSED',
      lastSyncedAt: new Date(),
    });

    await campaign.save();

    return res.json({
      message: 'Campaign created successfully (paused)',
      campaign,
    });
  } catch (err) {
    console.error('createCampaign error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to create campaign',
      detail: err.response?.data || err.message,
    });
  }
};
