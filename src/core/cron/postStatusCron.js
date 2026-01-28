import cron from 'node-cron';
import SocialPost from '../../entities/FacebookPost/post.mode.js';
import User from '../../entities/auth/auth.model.js';
import { verifyPostStatusBackground } from '../../entities/FacebookPost/post.controller.js';
import logger from '../config/logger.js';

/**
 * Check and update post statuses
 * Runs every 10 seconds to verify posts were actually published to Facebook/Instagram
 * Only checks posts that were recently published (within last 24 hours)
 */
export const startPostStatusCron = () => {
  // Run every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    try {
      logger.info('Running post status verification cron job...');

      // Find posts that need verification:
      // 1. Status is PUBLISHED or SCHEDULED
      // 2. Not yet verified (platformData.*.isVerified != true)
      // 3. Created within last 24 hours (to avoid checking old posts forever)
      // 4. Status check count < 20 (stop after 20 attempts)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const postsToVerify = await SocialPost.find({
        status: { $in: ['PUBLISHED', 'SCHEDULED'] },
        createdAt: { $gte: oneDayAgo },
        statusCheckCount: { $lt: 20 },
        $or: [
          { 'platformData.facebook.isVerified': { $ne: true } },
          { 'platformData.instagram.isVerified': { $ne: true } }
        ]
      })
        .limit(10) // Process 10 posts per run to avoid API rate limits
        .lean();

      if (postsToVerify.length === 0) {
        logger.info('No posts need status verification');
        return;
      }

      logger.info(`Found ${postsToVerify.length} posts to verify`);

      // Process each post
      for (const post of postsToVerify) {
        try {
          // Get user's Facebook access token
          const user = await User.findById(post.userId);

          if (!user) {
            logger.warn(`User not found for post ${post._id}`);
            continue;
          }

          const page = user.facebookBusinesses
            .flatMap((b) => b.pages)
            .find((p) => p.pageId === post.pageId);

          if (!page) {
            logger.warn(`Facebook page not found for post ${post._id}`);
            continue;
          }

          const token = page.pageAccessToken;

          // Verify post status
          const result = await verifyPostStatusBackground(post, token);

          if (result.success) {
            logger.info(`✓ Verified post ${post._id} successfully`);
          } else {
            logger.error(
              `✗ Failed to verify post ${post._id}: ${result.error}`
            );
          }
        } catch (postError) {
          logger.error(`Error processing post ${post._id}:`, postError.message);
        }
      }

      logger.info('Post status verification cron job completed');
    } catch (err) {
      logger.error('Post status cron job error:', err.message);
    }
  });

  logger.info(
    '📅 Post status verification cron job started (runs every 10 seconds)'
  );
};

/**
 * Mark old unverified posts as failed
 * Runs once per hour to clean up posts that couldn't be verified
 */
export const startPostCleanupCron = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running post cleanup cron job...');

      // Find posts that:
      // 1. Are older than 24 hours
      // 2. Still not verified
      // 3. Have status PUBLISHED or SCHEDULED
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await SocialPost.updateMany(
        {
          status: { $in: ['PUBLISHED', 'SCHEDULED'] },
          createdAt: { $lt: oneDayAgo },
          statusCheckCount: { $gte: 20 },
          $or: [
            { 'platformData.facebook.isVerified': { $ne: true } },
            { 'platformData.instagram.isVerified': { $ne: true } }
          ]
        },
        {
          $set: {
            status: 'FAILED',
            'platformData.facebook.errorMessage':
              'Could not verify post after 24 hours',
            'platformData.instagram.errorMessage':
              'Could not verify post after 24 hours',
            updatedAt: Date.now()
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(
          `Marked ${result.modifiedCount} unverified posts as FAILED`
        );
      } else {
        logger.info('No old unverified posts to clean up');
      }
    } catch (err) {
      logger.error('Post cleanup cron job error:', err.message);
    }
  });

  logger.info('🧹 Post cleanup cron job started (runs every hour)');
};
