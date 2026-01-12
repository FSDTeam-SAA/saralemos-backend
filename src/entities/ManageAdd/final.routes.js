import express from "express";
import { createCampaign } from "./final.controller.js";
import { userAdminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { createAdSet } from "./adSet.controller.js";
import { createAdCreative } from "./adCreative.controller.js";
import { multerUpload } from "../../core/middlewares/multer.js";
import { getPageAdsDashboard } from "./getAd.controller.js";



const router = express.Router()

router.post('/create-campaign',verifyToken,userAdminMiddleware,createCampaign)
router.post('/create-adSet',verifyToken,userAdminMiddleware,createAdSet)
router.post('/create-creativeAd',verifyToken,userAdminMiddleware,multerUpload([{ name: "ads", maxCount: 10 },]),createAdCreative)
router.get('/get',getPageAdsDashboard)
export default router