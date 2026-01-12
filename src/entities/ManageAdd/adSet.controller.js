import axios from 'axios';
import qs from 'querystring';

import FacebookAdSet from '../ManageAdd/adSet.model.js'
import FacebookCampaign from '../ManageAdd/campaign.Model.js';
import User from '../auth/auth.model.js';

const FB = (path) =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v17.0'}/${path}`;

export const createAdSet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { campaignId, adAccountId, pageId, name, dailyBudget, startDate, endDate, targeting } = req.body;

    if (!campaignId || !adAccountId || !name || !dailyBudget) {
      return res.status(400).json({ error: 'campaignId, adAccountId, name, and dailyBudget are required' });
    }

    // Fetch user to get page access token
    const user = await User.findById(userId);
    if (!user?.facebookBusinesses) {
      return res.status(400).json({ error: 'User has not connected Facebook' });
    }

    const page = user.facebookBusinesses.flatMap(b => b.pages || []).find(p => p.pageId === pageId);
    if (!page?.pageAccessToken) {
      return res.status(400).json({ error: 'Page access token not found' });
    }

    const pageAccessToken = page.pageAccessToken;
    const actId = adAccountId.toString().startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Fetch campaign to verify it exists
    const campaign = await FacebookCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
 // Determine optimization goal based on campaign objective
    let optimizationGoal;
    switch (campaign.objective) { // use campaign.objective here
      case 'OUTCOME_AWARENESS':
        optimizationGoal = 'REACH';
        break;
      case 'OUTCOME_LEADS':
        optimizationGoal = 'LEAD_GENERATION';
        break;
       // fallback for other campaigns
    }
    // Build targeting object for FB
    const fbTargeting = {
      geo_locations: { countries: (targeting?.locations || []).filter(l => l.length === 2).map(l => l.toUpperCase()) },
      age_min: targeting?.ageMin || 18,
      age_max: targeting?.ageMax || 65,
      genders: targeting?.gender ? [targeting.gender] : [],
      targeting_automation: { "advantage_audience": 0 }

    };
    

    // POST to Facebook to create Ad Set
    const createAdSetRes = await axios.post(
      FB(`${actId}/adsets`),
      qs.stringify({
        name,
        campaign_id: campaign.fbCampaignId,
        daily_budget: Math.round(dailyBudget * 100).toString(), // FB expects cents
        start_time: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_time: endDate ? new Date(endDate).toISOString() : undefined,
        billing_event: 'IMPRESSIONS',
        optimization_goal: optimizationGoal,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: JSON.stringify(fbTargeting),
        is_adset_budget_sharing_enabled: false, // individual budget
        status: 'PAUSED',
      }),
      { params: { access_token: pageAccessToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const fbAdSetId = createAdSetRes.data.id;

    // Save to DB
    const adSet = new FacebookAdSet({
      userId,
      adAccountId,
      campaign: campaignId,
      name,
      fbAdSetId,
      dailyBudget,
      startDate,
      endDate,
      targeting,
      status: 'PAUSED',
    });

    await adSet.save();

    res.json({ message: 'Ad Set created successfully (paused).', adSet });
  } catch (err) {
    console.error('createAdSet error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create Ad Set', detail: err.response?.data || err.message });
  }
};
