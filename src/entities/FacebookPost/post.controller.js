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
    const listingName = req.body.listingName;

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
        listingName,
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

    if (!page) {
      console.warn(`Page not found: ${pageId} for user: ${userId}`);
      return res.status(400).json({
        error: 'Facebook page not found in your connected accounts. Please connect your page first.',
        detail: `Page ID ${pageId} not found.`
      });
    }

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
      listingName,
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

/**
 * @desc    Get all posts for the logged-in user with filters
 * @route   GET /api/posts
 * @access  Private
 */
export const getAllPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, platform, postType, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { userId };
    if (status) query.status = status;
    if (postType) query.postType = postType;
    if (platform) query.platforms = platform;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await SocialPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await SocialPost.countDocuments(query);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get All Posts Error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch posts',
      detail: err.message
    });
  }
};

/**
 * @desc    Get single post by ID
 * @route   GET /api/posts/:id
 * @access  Private
 */
export const getPostById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const post = await SocialPost.findOne({ _id: id, userId }).lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json({
      success: true,
      data: post
    });
  } catch (err) {
    console.error('Get Post By ID Error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch post',
      detail: err.message
    });
  }
};

/**
 * @desc    Update a draft post
 * @route   PUT /api/posts/:id
 * @access  Private
 */
export const updatePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Find the post
    const post = await SocialPost.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only allow updates to DRAFT or FAILED posts
    if (post.status !== 'DRAFT' && post.status !== 'FAILED') {
      return res.status(400).json({
        error: 'Can only update DRAFT or FAILED posts'
      });
    }

    // Parse content if stringified
    let content = req.body.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid content format' });
      }
    }

    // Handle media uploads
    let mediaUrls = post.media.map((m) => m.url);

    if (req.files && req.files.length > 0) {
      // Upload new files to Cloudinary
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
        return res.status(500).json({
          error: 'Failed to upload images to Cloudinary'
        });
      }
    } else if (req.body.mediaUrls) {
      // Use provided media URLs
      mediaUrls =
        typeof req.body.mediaUrls === 'string'
          ? JSON.parse(req.body.mediaUrls)
          : req.body.mediaUrls;
    }

    // Determine media type
    const isVideo = mediaUrls[0]?.match(/\.(mp4|mov|avi)$/i);

    // Update fields
    if (content?.message) post.content.message = content.message;
    if (req.body.postType) post.postType = req.body.postType;
    if (req.body.platforms) {
      post.platforms =
        typeof req.body.platforms === 'string'
          ? JSON.parse(req.body.platforms)
          : req.body.platforms;
    }
    if (req.body.scheduledTime) {
      post.scheduledPublishTime = req.body.scheduledTime;
    }
    if (mediaUrls.length > 0) {
      post.media = mediaUrls.map((url) => ({
        url,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE'
      }));
    }

    post.updatedAt = Date.now();
    await post.save();

    return res.json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });
  } catch (err) {
    console.error('Update Post Error:', err.message);
    res.status(500).json({
      error: 'Failed to update post',
      detail: err.message
    });
  }
};

/**
 * @desc    Delete a post (only DRAFT or FAILED)
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
export const deletePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const post = await SocialPost.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only allow deletion of DRAFT or FAILED posts
    if (post.status !== 'DRAFT' && post.status !== 'FAILED') {
      return res.status(400).json({
        error: 'Can only delete DRAFT or FAILED posts'
      });
    }

    await SocialPost.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (err) {
    console.error('Delete Post Error:', err.message);
    res.status(500).json({
      error: 'Failed to delete post',
      detail: err.message
    });
  }
};

/**
 * @desc    Get real-time status of a post by checking Facebook API
 * @route   GET /api/posts/:id/status
 * @access  Private
 */
export const getPostStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const post = await SocialPost.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If it's a draft, no need to check Facebook
    if (post.status === 'DRAFT') {
      return res.json({
        success: true,
        data: {
          status: 'DRAFT',
          message: 'This is a draft post, not yet published'
        }
      });
    }

    // Get user's Facebook access token
    const user = await User.findById(userId);
    const page = user.facebookBusinesses
      .flatMap((b) => b.pages)
      .find((p) => p.pageId === post.pageId);

    if (!page) {
      return res.status(400).json({ error: 'Facebook page not found' });
    }

    const token = page.pageAccessToken;
    const statusData = {};

    // Check Facebook status
    if (
      post.platforms.includes('facebook') &&
      post.platformData?.facebook?.postId
    ) {
      try {
        const fbResponse = await axios.get(
          FB_API(post.platformData.facebook.postId),
          {
            params: {
              access_token: token,
              fields: 'id,message,created_time,is_published,status_type'
            }
          }
        );

        statusData.facebook = {
          status: 'PUBLISHED',
          isVerified: true,
          postId: fbResponse.data.id,
          createdTime: fbResponse.data.created_time,
          isPublished: fbResponse.data.is_published
        };

        // Update post with verified status
        post.platformData.facebook.status = 'PUBLISHED';
        post.platformData.facebook.isVerified = true;
        post.platformData.facebook.lastChecked = new Date();
      } catch (fbError) {
        const errorMsg =
          fbError.response?.data?.error?.message || fbError.message;
        statusData.facebook = {
          status: 'ERROR',
          isVerified: false,
          errorMessage: errorMsg
        };

        // Update post with error
        post.platformData.facebook.status = 'ERROR';
        post.platformData.facebook.errorMessage = errorMsg;
        post.platformData.facebook.lastChecked = new Date();
      }
    }

    // Check Instagram status
    if (
      post.platforms.includes('instagram') &&
      post.platformData?.instagram?.mediaId
    ) {
      try {
        const igResponse = await axios.get(
          FB_API(post.platformData.instagram.mediaId),
          {
            params: {
              access_token: token,
              fields: 'id,media_type,media_url,timestamp,caption'
            }
          }
        );

        statusData.instagram = {
          status: 'PUBLISHED',
          isVerified: true,
          mediaId: igResponse.data.id,
          timestamp: igResponse.data.timestamp
        };

        // Update post with verified status
        post.platformData.instagram.status = 'PUBLISHED';
        post.platformData.instagram.isVerified = true;
        post.platformData.instagram.lastChecked = new Date();
      } catch (igError) {
        const errorMsg =
          igError.response?.data?.error?.message || igError.message;
        statusData.instagram = {
          status: 'ERROR',
          isVerified: false,
          errorMessage: errorMsg
        };

        // Update post with error
        post.platformData.instagram.status = 'ERROR';
        post.platformData.instagram.errorMessage = errorMsg;
        post.platformData.instagram.lastChecked = new Date();
      }
    }

    // Update status check metadata
    post.lastStatusCheck = new Date();
    post.statusCheckCount = (post.statusCheckCount || 0) + 1;
    post.updatedAt = Date.now();

    await post.save();

    return res.json({
      success: true,
      data: {
        postId: post._id,
        status: post.status,
        platforms: statusData,
        lastChecked: post.lastStatusCheck,
        checkCount: post.statusCheckCount
      }
    });
  } catch (err) {
    console.error('Get Post Status Error:', err.message);
    res.status(500).json({
      error: 'Failed to check post status',
      detail: err.message
    });
  }
};

/**
 * @desc    Verify post status for cron job (background task)
 * @param   {Object} post - Post document
 * @param   {String} token - Facebook access token
 */
export const verifyPostStatusBackground = async (post, token) => {
  const updates = {};

  try {
    // Check Facebook status
    if (
      post.platforms.includes('facebook') &&
      post.platformData?.facebook?.postId
    ) {
      try {
        const fbResponse = await axios.get(
          FB_API(post.platformData.facebook.postId),
          {
            params: {
              access_token: token,
              fields: 'id,is_published,created_time'
            }
          }
        );

        if (fbResponse.data.is_published) {
          updates['platformData.facebook.status'] = 'PUBLISHED';
          updates['status'] = 'PUBLISHED'; // Ensure main status is updated
          updates['platformData.facebook.isVerified'] = true;
        } else {
          updates['platformData.facebook.status'] = 'SCHEDULED';
          updates['status'] = 'SCHEDULED';
          updates['platformData.facebook.isVerified'] = false;
        }
        updates['platformData.facebook.lastChecked'] = new Date();
      } catch (fbError) {
        const errorMsg =
          fbError.response?.data?.error?.message || fbError.message;
        updates['platformData.facebook.status'] = 'ERROR';
        updates['platformData.facebook.errorMessage'] = errorMsg;
        updates['platformData.facebook.lastChecked'] = new Date();
      }
    }

    // Check Instagram status
    if (
      post.platforms.includes('instagram') &&
      post.platformData?.instagram?.mediaId
    ) {
      try {
        const igResponse = await axios.get(
          FB_API(post.platformData.instagram.mediaId),
          {
            params: {
              access_token: token,
              fields: 'id,timestamp'
            }
          }
        );

        updates['platformData.instagram.status'] = 'PUBLISHED';
        updates['platformData.instagram.isVerified'] = true;
        updates['platformData.instagram.lastChecked'] = new Date();
      } catch (igError) {
        const errorMsg =
          igError.response?.data?.error?.message || igError.message;
        updates['platformData.instagram.status'] = 'ERROR';
        updates['platformData.instagram.errorMessage'] = errorMsg;
        updates['platformData.instagram.lastChecked'] = new Date();
      }
    }

    // Update metadata
    updates.lastStatusCheck = new Date();
    updates.statusCheckCount = (post.statusCheckCount || 0) + 1;
    updates.updatedAt = Date.now();

    // Apply updates
    await SocialPost.findByIdAndUpdate(post._id, { $set: updates });

    return { success: true, postId: post._id };
  } catch (err) {
    console.error(
      `Background verification failed for post ${post._id}:`,
      err.message
    );
    return { success: false, postId: post._id, error: err.message };
  }
};

/**
 * @desc    Publish a draft post
 * @route   POST /api/posts/:id/publish
 * @access  Private
 */
export const publishDraft = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Find the post
    const post = await SocialPost.findOne({ _id: id, userId });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status !== 'DRAFT' && post.status !== 'FAILED') {
      return res.status(400).json({ error: 'Post is already published or scheduled' });
    }

    const user = await User.findById(userId);
    const page = user.facebookBusinesses
      .flatMap((b) => b.pages)
      .find((p) => p.pageId === post.pageId);

    if (!page) {
      return res.status(400).json({ error: 'Facebook page not found in user account' });
    }

    const token = page.pageAccessToken;
    const isScheduling = post.status === 'SCHEDULED' || !!post.scheduledPublishTime;
    const unixTimestamp = post.scheduledPublishTime
      ? Math.round(new Date(post.scheduledPublishTime).getTime() / 1000)
      : null;

    const hasMedia = post.media.length > 0;
    const mediaUrls = post.media.map(m => m.url);
    const isVideo = post.media[0]?.mediaType === 'VIDEO';
    const message = post.content.message;

    const apiResults = { fb: {}, ig: {} };

    // --- FACEBOOK ---
    if (post.platforms.includes('facebook')) {
      let endpoint = `${post.pageId}/feed`;
      if (hasMedia) {
        endpoint = isVideo ? `${post.pageId}/videos` : `${post.pageId}/photos`;
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

    // --- INSTAGRAM ---
    if (post.platforms.includes('instagram') && hasMedia) {
      const igIdInfo = await axios.get(FB_API(post.pageId), {
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

    // Update post status and platform data
    post.status = isScheduling ? 'SCHEDULED' : 'PUBLISHED';
    if (apiResults.fb.id) post.platformData.facebook = { postId: apiResults.fb.id, status: 'PENDING' };
    if (apiResults.ig.id) post.platformData.instagram = { mediaId: apiResults.ig.id, status: 'PENDING' };
    post.updatedAt = Date.now();

    await post.save();

    return res.json({
      success: true,
      message: `Successfully ${post.status.toLowerCase()}`,
      post
    });
  } catch (err) {
    console.error('Publish Draft Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to publish draft',
      detail: err.response?.data || err.message
    });
  }
};
