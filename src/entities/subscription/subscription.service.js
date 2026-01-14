import SubscriptionPlan from "./subscription.model.js";


export const createSubscriptionPlan = async (data) => {
  return await SubscriptionPlan.create(data);
};

export const getAllSubscriptionPlans = async () => {
  return await SubscriptionPlan.find().sort({ createdAt: -1 });
};

export const getSubscriptionPlanById = async (id) => {
  return await SubscriptionPlan.findById(id);
};

export const updateSubscriptionPlan = async (id, data) => {
  return await SubscriptionPlan.findByIdAndUpdate(id, data, { new: true });
};

export const deleteSubscriptionPlan = async (id) => {
  return await SubscriptionPlan.findByIdAndDelete(id);
};