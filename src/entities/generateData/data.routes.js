import express from 'express';
import { createAd, generateAd, getAdById, getAllAds} from './data.controller.js';
import { multerUpload } from '../../core/middlewares/multer.js';
import { userAdminMiddleware, verifyToken } from '../../core/middlewares/authMiddleware.js';
import { publishAd } from '../facebookAd/facebookAd.controller.js';


const router = express.Router();

// POST /api/generate-ad
router.post('/generate-ad', generateAd);

router.post('/save',verifyToken,userAdminMiddleware, multerUpload([{ name: "ads", maxCount: 10 },]),createAd);
router.get('/all', verifyToken, userAdminMiddleware,getAllAds);

// Get ad by ID
router.get('/:id', verifyToken,userAdminMiddleware, getAdById);

router.post('/final-post',verifyToken,userAdminMiddleware,publishAd)
export default router;
