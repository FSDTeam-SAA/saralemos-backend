import { generateResponse } from "../../lib/responseFormate.js";
import { createSubscriptionPlan, deleteSubscriptionPlan, getAllSubscriptionPlans, getSubscriptionPlanById, updateSubscriptionPlan } from "./subscription.service.js";


export const createPlan = async (req, res) => {
  try {
    const plan = await createSubscriptionPlan(req.body);
    generateResponse(res, 201, true, 'Subscription plan created successfully', plan);
  } catch (err) {
    generateResponse(res, 400, false, err.message);
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await getAllSubscriptionPlans();
    generateResponse(res, 200, true, 'Subscription plans retrieved successfully', plans);
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

export const getPlanById = async (req, res) => {
  try {
    const plan = await getSubscriptionPlanById(req.params.id);
    if (!plan) return generateResponse(res, 404, false, 'Plan not found');
    generateResponse(res, 200, true, 'Subscription plan retrieved successfully', plan);
  } catch (err) {
    generateResponse(res, 400, false, err.message);
  }
};

export const updatePlan = async (req, res) => {
  try {
    const updatedPlan = await updateSubscriptionPlan(req.params.id, req.body);
    if (!updatedPlan) return generateResponse(res, 404, false, 'Plan not found');
    generateResponse(res, 200, true, 'Subscription plan updated successfully', updatedPlan);
  } catch (err) {
    generateResponse(res, 400, false, err.message);
  }
};

export const deletePlan = async (req, res) => {
  try {
    const deleted = await deleteSubscriptionPlan(req.params.id);
    if (!deleted) {
      return generateResponse(res, 404, false, 'Plan not found');
    }
    generateResponse(res, 200, true, 'Subscription plan deleted successfully');
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};