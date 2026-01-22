import User from '../auth/auth.model.js';
import Payment from '../subscription/payment.model.js';

/**
 * Get monthly user analytics (count of users created each month)
 * Used for line graph showing user growth trend
 */
export const getUserAnalytics = async () => {
  try {
    const userAnalytics = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          userCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          userCount: 1,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          }
        }
      }
    ]);

    return userAnalytics;
  } catch (error) {
    throw new Error(`Failed to fetch user analytics: ${error.message}`);
  }
};

/**
 * Get monthly revenue trend (total revenue from successful payments each month)
 * Used for histogram graph showing revenue trends
 */
export const getRevenueTrend = async () => {
  try {
    const revenueTrend = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed' // Only count successful payments
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          paymentCount: 1,
          averageAmount: { $round: ['$averageAmount', 2] },
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          }
        }
      }
    ]);

    return revenueTrend;
  } catch (error) {
    throw new Error(`Failed to fetch revenue trend: ${error.message}`);
  }
};

/**
 * Get combined dashboard data (user analytics + revenue trend)
 * Returns complete dashboard overview
 */
export const getDashboardData = async () => {
  try {
    const [userAnalytics, revenueTrend] = await Promise.all([
      getUserAnalytics(),
      getRevenueTrend()
    ]);

    // Calculate summary statistics
    const totalUsers = userAnalytics.reduce(
      (sum, item) => sum + item.userCount,
      0
    );
    const totalRevenue = revenueTrend.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );
    const totalPayments = revenueTrend.reduce(
      (sum, item) => sum + item.paymentCount,
      0
    );

    return {
      summary: {
        totalUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPayments,
        averageRevenuePerPayment:
          totalPayments > 0
            ? Math.round((totalRevenue / totalPayments) * 100) / 100
            : 0
      },
      userAnalytics,
      revenueTrend
    };
  } catch (error) {
    throw new Error(`Failed to fetch dashboard data: ${error.message}`);
  }
};

/**
 * Get user analytics for a specific date range
 */
export const getUserAnalyticsByDateRange = async (startDate, endDate) => {
  try {
    const userAnalytics = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          userCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          userCount: 1,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          }
        }
      }
    ]);

    return userAnalytics;
  } catch (error) {
    throw new Error(`Failed to fetch user analytics: ${error.message}`);
  }
};

/**
 * Get revenue trend for a specific date range
 */
export const getRevenueTrendByDateRange = async (startDate, endDate) => {
  try {
    const revenueTrend = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          paymentCount: 1,
          averageAmount: { $round: ['$averageAmount', 2] },
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          }
        }
      }
    ]);

    return revenueTrend;
  } catch (error) {
    throw new Error(`Failed to fetch revenue trend: ${error.message}`);
  }
};
