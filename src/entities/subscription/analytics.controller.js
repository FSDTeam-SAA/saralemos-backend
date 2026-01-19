import { generateResponse } from '../../lib/responseFormate.js';
import User from '../auth/auth.model.js';
import Payment from './payment.model.js';

export const getDashboardOverview = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get active subscriptions count (users with hasActiveSubscription: true)
    const activeSubscriptions = await User.countDocuments({
      hasActiveSubscription: true
    });

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
