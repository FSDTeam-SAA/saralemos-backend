import axios from 'axios';
import qs from 'querystring';


import FacebookAdCreative from '../ManageAdd/AdCreative.model.js';
import User from '../auth/auth.model.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';


const FB = (path) =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v17.0'}/${path}`;

export const createAdCreative = async (req, res) => {
  try {
    const userId = req.user._id;
    const { adAccountId, pageId, adSetId } = req.body;
    let adCreative = req.body.adCreative;

if (typeof adCreative === "string") {
  adCreative = JSON.parse(adCreative);
}

    if (!adAccountId || !pageId || !adSetId ) {
      return res.status(400).json({
        error: 'adAccountId, pageId, adSetId and adCreative are required',
      });
    }

    if (!req.files || !req.files.ads || req.files.ads.length === 0) {
      return res.status(400).json({ error: 'No media file uploaded' });
    }

    const user = await User.findById(userId);
    if (!user?.facebookBusinesses) {
      return res.status(400).json({ error: 'User has not connected Facebook' });
    }

    const page = user.facebookBusinesses
      .flatMap((b) => b.pages || [])
      .find((p) => p.pageId === pageId);

    if (!page?.pageAccessToken) {
      return res.status(400).json({ error: 'Page access token not found' });
    }

    const pageAccessToken = page.pageAccessToken;
    const actId = adAccountId.toString().startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Upload files to Cloudinary
    const mediaUrls = [];
    for (const file of req.files.ads) {
      const uploaded = await cloudinaryUpload(file.path, file.filename, 'facebook-ads');
      if (uploaded === 'file upload failed') {
        return res.status(500).json({ error: 'Failed to upload file to Cloudinary' });
      }
      mediaUrls.push(uploaded.secure_url);
    }

    // Upload first media to Facebook (for single image/video creative)
    let mediaHash;
    if (adCreative.format === 'SINGLE_IMAGE') {
      const uploadRes = await axios.post(
        FB(`${actId}/adimages`),
        qs.stringify({ url: mediaUrls[0] }),
        { params: { access_token: pageAccessToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      mediaHash = Object.values(uploadRes.data.images)[0]?.hash;
      if (!mediaHash) {
        return res.status(500).json({ error: 'Failed to upload image to Facebook', raw: uploadRes.data });
      }
    } else if (adCreative.format === 'VIDEO') {
      // Video upload to Facebook placeholder
      mediaHash = 'VIDEO_ID_FROM_FB'; // Replace with actual video upload logic
    }

    // Build object_story_spec
    const objectStorySpec = {
      page_id: pageId,
      link_data: {
        message: adCreative.primaryText,
        link: adCreative.destinationUrl,
        name: adCreative.headline,
        call_to_action: { type: 'LEARN_MORE', value: { link: adCreative.destinationUrl } },
      },
    };
    if (adCreative.format === 'SINGLE_IMAGE') objectStorySpec.link_data.image_hash = mediaHash;
    if (adCreative.format === 'VIDEO') objectStorySpec.video_data = { video_id: mediaHash };

    // Create ad creative on Facebook
    const createCreativeRes = await axios.post(
      FB(`${actId}/adcreatives`),
      qs.stringify({
        name: adCreative.name,
        object_story_spec: JSON.stringify(objectStorySpec),
      }),
      { params: { access_token: pageAccessToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const fbAdCreativeId = createCreativeRes.data.id;

    // Save creative to DB
    const creative = new FacebookAdCreative({
      userId,
      adAccountId,
      adSet: adSetId,
      name: adCreative.name,
      fbAdCreativeId,
      headline: adCreative.headline,
      primaryText: adCreative.primaryText,
      destinationUrl: adCreative.destinationUrl,
      mediaUrls,
      format: adCreative.format,
      status: 'DRAFT',
    });

    await creative.save();

    return res.json({
      message: 'Ad creative created successfully (draft).',
      creative,
    });
  } catch (err) {
    console.error('createAdCreative error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to create ad creative',
      detail: err.response?.data || err.message,
    });
  }
};
