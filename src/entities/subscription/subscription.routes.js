import express from 'express';
import { createPlan, deletePlan, getPlanById, getPlans, updatePlan } from './subscription.controller.js';


const router = express.Router();

router.post('/create', createPlan);          
router.get('/get-all', getPlans);              
router.get('/:id', getPlanById);      
router.put('/:id', updatePlan);         
router.delete('/delete/:id', deletePlan); 

export default router;
