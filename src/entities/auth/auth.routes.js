import express from 'express';
import {
  loginUser,
  refreshAccessToken,
  forgetPassword,
  verifyCode,
  resetPassword,
  changePassword,
  logoutUser,
  registerUser
} from './auth.controller.js';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import { multerUpload } from '../../core/middlewares/multer.js';

const router = express.Router();

// Accept image uploads for profilePhoto, companyLogo, bannerImage
router.post(
  '/register',
  multerUpload([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]),
  registerUser
);
router.post('/login', loginUser);
router.post('/refresh-access-token', refreshAccessToken);
router.post('/forget-password', forgetPassword);
router.post('/verify-code', verifyCode);
router.post('/reset-password', resetPassword);
router.post('/change-password', verifyToken, changePassword);
router.post('/logout', verifyToken, logoutUser);

export default router;
