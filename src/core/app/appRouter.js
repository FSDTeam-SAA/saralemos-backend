import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import adRoutes from '../../entities/generateData/data.routes.js'
import connectRoutes from '../../entities/connectMedia/connectMedia.routes.js'
import campaignRoutes from '../../entities/ManageAdd/final.routes.js'
const router = express.Router();


router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/ai',adRoutes)
router.use('/v1/connect',connectRoutes)
router.use("/v1/final",campaignRoutes)



export default router;
