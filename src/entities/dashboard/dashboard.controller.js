import { generateResponse } from '../../lib/responseFormate.js';
import {
  getUserAnalytics,
  getRevenueTrend,
  getDashboardData,
  getUserAnalyticsByDateRange,
  getRevenueTrendByDateRange
} from './dashboard.service.js';

/**
 * Get monthly user analytics (line graph data)
 * Shows how many new users are created each month
 */
export const getUserAnalyticsController = async (req, res) => {
  try {
    const analytics = await getUserAnalytics();

    if (!analytics || analytics.length === 0) {
      return generateResponse(
        res,
        200,
        true,
        'No user analytics available yet',
        []
      );
    }

    generateResponse(
      res,
      200,
      true,
      'User analytics retrieved successfully',
      analytics
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

/**
 * Get monthly revenue trend (histogram graph data)
 * Shows total revenue from successful payments each month
 */
export const getRevenueTrendController = async (req, res) => {
  try {
    const revenueTrend = await getRevenueTrend();

    if (!revenueTrend || revenueTrend.length === 0) {
      return generateResponse(
        res,
        200,
        true,
        'No revenue data available yet',
        []
      );
    }

    generateResponse(
      res,
      200,
      true,
      'Revenue trend retrieved successfully',
      revenueTrend
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

/**
 * Get complete dashboard overview
 * Combines user analytics, revenue trend, and summary statistics
 */
export const getDashboardDataController = async (req, res) => {
  try {
    const dashboardData = await getDashboardData();
    generateResponse(
      res,
      200,
      true,
      'Dashboard data retrieved successfully',
      dashboardData
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

/**
 * Get user analytics for a specific date range
 * Query parameters: startDate and endDate (ISO format)
 */
export const getUserAnalyticsByDateRangeController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return generateResponse(
        res,
        400,
        false,
        'startDate and endDate are required (ISO format)'
      );
    }

    // Validate date format
    if (
      isNaN(new Date(startDate).getTime()) ||
      isNaN(new Date(endDate).getTime())
    ) {
      return generateResponse(
        res,
        400,
        false,
        'Invalid date format. Please use ISO format (YYYY-MM-DD)'
      );
    }

    const analytics = await getUserAnalyticsByDateRange(startDate, endDate);

    if (!analytics || analytics.length === 0) {
      return generateResponse(
        res,
        200,
        true,
        'No user analytics available for the specified date range',
        []
      );
    }

    generateResponse(
      res,
      200,
      true,
      'User analytics retrieved successfully',
      analytics
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

/**
 * Get revenue trend for a specific date range
 * Query parameters: startDate and endDate (ISO format)
 */
export const getRevenueTrendByDateRangeController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return generateResponse(
        res,
        400,
        false,
        'startDate and endDate are required (ISO format)'
      );
    }

    // Validate date format
    if (
      isNaN(new Date(startDate).getTime()) ||
      isNaN(new Date(endDate).getTime())
    ) {
      return generateResponse(
        res,
        400,
        false,
        'Invalid date format. Please use ISO format (YYYY-MM-DD)'
      );
    }

    const revenueTrend = await getRevenueTrendByDateRange(startDate, endDate);

    if (!revenueTrend || revenueTrend.length === 0) {
      return generateResponse(
        res,
        200,
        true,
        'No revenue data available for the specified date range',
        []
      );
    }

    generateResponse(
      res,
      200,
      true,
      'Revenue trend retrieved successfully',
      revenueTrend
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};
