import Campaign from '../ManageAdd/campaign.Model.js';
import AdSet from '../ManageAdd/adSet.model.js';
import FacebookAdCreative from '../ManageAdd/AdCreative.model.js';
import User from '../auth/auth.model.js';

export const getPageAdsDashboard = async (req, res) => {
  try {
    const { userId, pageId } = req.query;

    if (!userId || !pageId) {
      return res.status(400).json({ error: 'userId and pageId are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Step 1: Get campaigns for this page
    const campaigns = await Campaign.find({ 'page.pageId': pageId, userId });

    // Step 2: Get ad sets for these campaigns
    const campaignIds = campaigns.map((c) => c._id);
    const adSets = await AdSet.find({ campaign: { $in: campaignIds }, userId });

    // Step 3: Get ad creatives for these ad sets
    const adSetIds = adSets.map((s) => s._id);
    const creatives = await FacebookAdCreative.find({ adSet: { $in: adSetIds }, userId });

    // Step 4: Nest ad sets under campaigns and creatives under ad sets
    const adSetsMap = adSets.map((adSet) => ({
      ...adSet.toObject(),
      creatives: creatives.filter((c) => c.adSet.toString() === adSet._id.toString()),
    }));

    const result = campaigns.map((campaign) => ({
      ...campaign.toObject(),
      adSets: adSetsMap.filter((adSet) => adSet.campaign.toString() === campaign._id.toString()),
    }));

    return res.json({
      pageId,
      pageName: campaigns[0]?.page?.pageName || 'Page',
      campaigns: result,
    });
  } catch (err) {
    console.error('getPageAdsDashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch page ads', detail: err.message });
  }
};
