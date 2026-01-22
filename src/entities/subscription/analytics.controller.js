import { generateResponse } from '../../lib/responseFormate.js';
import User from '../auth/auth.model.js';
import Payment from './payment.model.js';
import { YachtListing } from '../listings/listing.model.js';


export const getPaymentMetrics = async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Get all completed payments
    const completedPayments = await Payment.find({
      paymentStatus: 'completed'
    });

    // Calculate MRR (Monthly Recurring Revenue)
    // Get monthly payments from current month
    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          billingCycle: 'monthly',
          createdAt: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Convert other billing cycles to monthly equivalent
    const yearlyPayments = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          billingCycle: { $in: ['yearly', 'annual'] },
          createdAt: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const quarterlyPayments = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          billingCycle: 'quarterly',
          createdAt: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyMRR =
      monthlyPayments.length > 0 ? monthlyPayments[0].total : 0;
    const yearlyMRR =
      yearlyPayments.length > 0 ? yearlyPayments[0].total / 12 : 0;
    const quarterlyMRR =
      quarterlyPayments.length > 0 ? quarterlyPayments[0].total / 3 : 0;

    const MRR = monthlyMRR + yearlyMRR + quarterlyMRR;

    // Calculate ARPU (Average Revenue Per User)
    const totalActiveUsers = await User.countDocuments({
      hasActiveSubscription: true
    });

    const totalRevenue = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const ARPU = totalActiveUsers > 0 ? totalRevenue / totalActiveUsers : 0;

    // Calculate LTV (Lifetime Value)
    // LTV = ARPU * Average Customer Lifespan (in months)
    // We'll estimate average lifespan based on subscription data
    const avgLifespanMonths = 12; // Default assumption: 12 months
    const LTV = ARPU * avgLifespanMonths;

    // Calculate CAC (Customer Acquisition Cost)
    // For now, we'll calculate based on total marketing spend / new customers
    // This would need actual marketing data, so we'll use a placeholder
    const totalUsers = await User.countDocuments();
    const estimatedMarketingSpend = 0; // You should replace this with actual data
    const CAC = totalUsers > 0 ? estimatedMarketingSpend / totalUsers : 0;

    // Additional metrics
    const totalPayments = completedPayments.length;
    const totalRevenueAllTime = totalRevenue;

    const metrics = {
      MRR: {
        value: parseFloat(MRR.toFixed(2)),
        currency: 'usd',
        description: 'Monthly Recurring Revenue',
        breakdown: {
          monthly: parseFloat(monthlyMRR.toFixed(2)),
          yearly: parseFloat(yearlyMRR.toFixed(2)),
          quarterly: parseFloat(quarterlyMRR.toFixed(2))
        }
      },
      ARPU: {
        value: parseFloat(ARPU.toFixed(2)),
        currency: 'usd',
        description: 'Average Revenue Per User',
        activeUsers: totalActiveUsers
      },
      LTV: {
        value: parseFloat(LTV.toFixed(2)),
        currency: 'usd',
        description: 'Customer Lifetime Value',
        assumedLifespanMonths: avgLifespanMonths
      },
      CAC: {
        value: parseFloat(CAC.toFixed(2)),
        currency: 'usd',
        description: 'Customer Acquisition Cost',
        note: 'Configure marketing spend for accurate CAC'
      },
      additionalMetrics: {
        totalPayments,
        totalRevenueAllTime: parseFloat(totalRevenueAllTime.toFixed(2)),
        totalUsers,
        activeSubscriptions: totalActiveUsers,
        LTVtoCAC: CAC > 0 ? parseFloat((LTV / CAC).toFixed(2)) : 0
      }
    };

    generateResponse(
      res,
      200,
      true,
      'Payment metrics retrieved successfully',
      metrics
    );
  } catch (err) {
    console.error('Payment metrics error:', err);
    generateResponse(res, 500, false, err.message);
  }
};

export const getPlanAnalytics = async (req, res) => {
  try {
    const { planId } = req.params;

    // Verify plan exists
    const plan = await Payment.findOne({ subscriptionPlanId: planId });
    if (!plan) {
      return generateResponse(res, 404, false, 'No data found for this plan');
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Get all users who ever paid for this plan
    const allPaymentsForPlan = await Payment.find({
      subscriptionPlanId: planId,
      paymentStatus: 'completed'
    }).populate('userId');

    // Get unique user IDs who ever subscribed to this plan
    const allUserIds = [
      ...new Set(allPaymentsForPlan.map((p) => p.userId._id.toString()))
    ];
    const totalUsersEver = allUserIds.length;

    // Get active users with this plan (users with active subscription)
    const activeUsersWithPlan = allPaymentsForPlan.filter(
      (payment) =>
        payment.userId && payment.userId.hasActiveSubscription === true
    );
    const uniqueActiveUsers = [
      ...new Set(activeUsersWithPlan.map((p) => p.userId._id.toString()))
    ];
    const activeUsersCount = uniqueActiveUsers.length;

    // Calculate monthly revenue for this plan
    const monthlyRevenueData = await Payment.aggregate([
      {
        $match: {
          subscriptionPlanId: planId,
          paymentStatus: 'completed',
          createdAt: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    const monthlyRevenue =
      monthlyRevenueData.length > 0 ? monthlyRevenueData[0].totalRevenue : 0;
    const monthlyPaymentCount =
      monthlyRevenueData.length > 0 ? monthlyRevenueData[0].paymentCount : 0;

    // Calculate churn rate
    // Churn Rate = (Users who stopped / Total users who ever had this plan) * 100
    const churnedUsers = totalUsersEver - activeUsersCount;
    const churnRate =
      totalUsersEver > 0 ? (churnedUsers / totalUsersEver) * 100 : 0;

    // Calculate retention rate
    const retentionRate =
      totalUsersEver > 0 ? (activeUsersCount / totalUsersEver) * 100 : 0;

    // Get total all-time revenue for this plan
    const allTimeRevenue = allPaymentsForPlan.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const planAnalytics = {
      planId,
      activeUsers: activeUsersCount,
      monthlyRevenue: {
        amount: parseFloat(monthlyRevenue.toFixed(2)),
        currency: 'usd',
        paymentCount: monthlyPaymentCount,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      churnRate: {
        percentage: parseFloat(churnRate.toFixed(2)),
        churnedUsers,
        totalUsersEver
      },
      retentionRate: {
        percentage: parseFloat(retentionRate.toFixed(2)),
        description: 'Percentage of users still active'
      },
      additionalMetrics: {
        allTimeRevenue: parseFloat(allTimeRevenue.toFixed(2)),
        totalPayments: allPaymentsForPlan.length,
        averageRevenuePerUser:
          totalUsersEver > 0
            ? parseFloat((allTimeRevenue / totalUsersEver).toFixed(2))
            : 0
      }
    };

    generateResponse(
      res,
      200,
      true,
      'Plan analytics retrieved successfully',
      planAnalytics
    );
  } catch (err) {
    console.error('Plan analytics error:', err);
    generateResponse(res, 500, false, err.message);
  }
};

export const getDashboardOverview = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get active subscriptions count (users with hasActiveSubscription: true)
    const activeSubscriptions = await User.countDocuments({
      hasActiveSubscription: true
    });

    // Total yacht listings
    const totalListings = await YachtListing.countDocuments();

    // Calculate monthly revenue
    // Get the first and last day of the current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Sum all completed payments for the current month
    const monthlyRevenueData = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyRevenue =
      monthlyRevenueData.length > 0 ? monthlyRevenueData[0].totalRevenue : 0;
    const monthlyPaymentCount =
      monthlyRevenueData.length > 0 ? monthlyRevenueData[0].count : 0;

    // Prepare response data
    const dashboardData = {
      totalUsers,
      activeSubscriptions,
      totalListings,
      monthlyRevenue: {
        amount: monthlyRevenue,
        currency: 'usd',
        paymentCount: monthlyPaymentCount,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      inactiveUsers: totalUsers - activeSubscriptions
    };

    generateResponse(
      res,
      200,
      true,
      'Dashboard overview retrieved successfully',
      dashboardData
    );
  } catch (err) {
    console.error('Dashboard overview error:', err);
    generateResponse(res, 500, false, err.message);
  }
};
