import express from 'express';
import {
  getUserAnalyticsController,
  getRevenueTrendController,
  getDashboardDataController,
  getUserAnalyticsByDateRangeController,
  getRevenueTrendByDateRangeController,
  getClientDashboardAnalyticsController
} from './dashboard.controller.js';

const router = express.Router();

/**
 * @route   GET /v1/dashboard/overview
 * @desc    Get complete dashboard overview with user analytics and revenue trend
 * @access  Public
 */
router.get('/overview', getDashboardDataController);

/**
 * @route   GET /v1/dashboard/user-analytics
 * @desc    Get monthly user analytics (line graph data)
 * @access  Public
 */
router.get('/user-analytics', getUserAnalyticsController);

/**
 * @route   GET /v1/dashboard/revenue-trend
 * @desc    Get monthly revenue trend (histogram graph data)
 * @access  Public
 */
router.get('/revenue-trend', getRevenueTrendController);

/**
 * @route   GET /v1/dashboard/user-analytics-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @desc    Get user analytics for a specific date range
 * @access  Public
 * @query   startDate - Start date (ISO format)
 * @query   endDate - End date (ISO format)
 */
router.get('/user-analytics-range', getUserAnalyticsByDateRangeController);

/**
 * @route   GET /v1/dashboard/revenue-trend-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @desc    Get revenue trend for a specific date range
 * @access  Public
 * @query   startDate - Start date (ISO format)
 * @query   endDate - End date (ISO format)
 */
router.get('/revenue-trend-range', getRevenueTrendByDateRangeController);

/**
 * @route   GET /v1/dashboard/client
 * @desc    Client dashboard: listings, campaigns, demo metrics
 * @access  Private (requires auth middleware to set req.user)
 */
router.get('/client/:userId', getClientDashboardAnalyticsController);

export default router;
