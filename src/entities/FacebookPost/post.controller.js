import axios from 'axios';
import qs from 'querystring';
import SocialPost from './post.mode.js';
import User from '../auth/auth.model.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';

const FB_API = (path) =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v17.0'}/${path}`;

export const handleFinalizePost = async (req, res) => {
  try {
    const userId = req.user._id;
    let content;
    try {
      content =
        typeof req.body.content === 'string'
          ? JSON.parse(req.body.content)
          : req.body.content;
    } catch (e) {
      return res
        .status(400)
        .json({ error: 'Invalid format for content field.' });
    }

    // 2. Validate that the message exists after parsing
    if (!content || !content.message) {
      return res.status(400).json({ error: 'content.message is required.' });
    }
    // 1. Parse incoming body (Handle Postman stringified JSON)
    const status = req.body.status;
    const pageId = req.body.pageId;
    const postType = req.body.postType;
    const message = content.message;
    const scheduledTime = req.body.scheduledTime;

    const platforms =
      typeof req.body.platforms === 'string'
        ? JSON.parse(req.body.platforms)
        : req.body.platforms || [];

    let mediaUrls = [];

    // Handle three scenarios:
    // 1. postImages files uploaded - upload to Cloudinary
    // 2. mediaUrls provided directly
    // 3. Empty (no media)

    if (req.files && req.files.length > 0) {
      // Scenario 1: Upload multiple files to Cloudinary
      try {
        const uploadPromises = req.files.map((file, index) =>
          cloudinaryUpload(
            file.path,
            `facebook_post_${Date.now()}_${index}`,
            'facebook_posts'
          )
        );
        const uploadResults = await Promise.all(uploadPromises);
        mediaUrls = uploadResults.map((result) => result.secure_url);
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        return res
          .status(500)
          .json({ error: 'Failed to upload images to Cloudinary' });
      }
    } else if (req.body.mediaUrls) {
      // Scenario 2: Direct media URLs provided
      mediaUrls =
        typeof req.body.mediaUrls === 'string'
          ? JSON.parse(req.body.mediaUrls)
          : req.body.mediaUrls;
    }
    // Scenario 3: mediaUrls remains empty array (no media)

    // 2. Detection Logic
    const isVideo =
      postType === 'VIDEO' ||
      (mediaUrls[0] && mediaUrls[0].match(/\.(mp4|mov|avi)$/i));
    const hasMedia = mediaUrls.length > 0;

    // 3. Save as Draft Fix
    if (status === 'DRAFT') {
      const draft = new SocialPost({
        userId,
        pageId,
        postType,
        platforms,
        content: { message },
        media: mediaUrls.map((url) => ({
          url,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE'
        })),
        status: 'DRAFT'
      });
      await draft.save();
      return res.json({ message: 'Saved to drafts', post: draft });
    }

    // 4. PREPARE FOR META API
    const user = await User.findById(userId);
    const page = user.facebookBusinesses
      .flatMap((b) => b.pages)
      .find((p) => p.pageId === pageId);
    const token = page.pageAccessToken;
    const isScheduling = status === 'SCHEDULED';
    const unixTimestamp = isScheduling
      ? Math.round(new Date(scheduledTime).getTime() / 1000)
      : null;

    const apiResults = { fb: {}, ig: {} };

    // --- FACEBOOK FIX ---
    if (platforms.includes('facebook')) {
      // Dynamic endpoint based on media type
      let endpoint = `${pageId}/feed`;
      if (hasMedia) {
        endpoint = isVideo ? `${pageId}/videos` : `${pageId}/photos`;
      }

      const fbParams = {
        access_token: token,
        published: !isScheduling,
        [isVideo ? 'description' : 'message']: message,
        ...(isScheduling && { scheduled_publish_time: unixTimestamp })
      };

      if (hasMedia) {
        fbParams[isVideo ? 'file_url' : 'url'] = mediaUrls[0];
      }

      const fbRes = await axios.post(FB_API(endpoint), qs.stringify(fbParams));
      apiResults.fb = { id: fbRes.data.id || fbRes.data.post_id };
    }

    // --- INSTAGRAM FIX ---
    if (platforms.includes('instagram') && hasMedia) {
      const igIdInfo = await axios.get(FB_API(pageId), {
        params: { fields: 'instagram_business_account', access_token: token }
      });
      const igId = igIdInfo.data.instagram_business_account.id;

      const igParams = {
        access_token: token,
        caption: message,
        media_type: isVideo ? 'VIDEO' : 'IMAGE',
        [isVideo ? 'video_url' : 'image_url']: mediaUrls[0],
        ...(isScheduling && { scheduled_publish_time: unixTimestamp })
      };

      const container = await axios.post(
        FB_API(`${igId}/media`),
        qs.stringify(igParams)
      );
      const publishRes = await axios.post(
        FB_API(`${igId}/media_publish`),
        qs.stringify({
          creation_id: container.data.id,
          access_token: token
        })
      );
      apiResults.ig = { id: publishRes.data.id };
    }

    // 5. Final Save
    const finalPost = new SocialPost({
      userId,
      pageId,
      postType,
      platforms,
      content: { message },
      media: mediaUrls.map((url) => ({
        url,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE'
      })),
      status: status,
      scheduledPublishTime: isScheduling ? scheduledTime : null,
      platformData: {
        facebook: { postId: apiResults.fb.id },
        instagram: { mediaId: apiResults.ig.id }
      }
    });

    await finalPost.save();
    return res.json({
      message: `Successfully ${status.toLowerCase()}`,
      post: finalPost
    });
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Operation failed',
      detail: err.response?.data || err.message
    });
  }
};
