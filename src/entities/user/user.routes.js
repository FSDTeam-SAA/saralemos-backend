import { multerUpload } from "../../core/middlewares/multer.js";
import { 
     getAllUsersController, getAllAdminsController, getAllSelleresController,
     createAvatarController,updateAvatarProfileController,deleteAvatarController,
     createMultipleAvatarController,updateMultipleAvatarController,deleteMultipleAvatarController,
     createUserPDFController,updateUserPDFController,deleteUserPDFController,
     getUserProfileController,
     updateUserProfileController,
     deleteOwnAccountController,
     adminGetUserByIdController,
     adminUpdateUserController,
     adminDeleteUserController
    } from "./user.controller.js";
import { adminMiddleware,  userAdminMiddleware,  verifyToken } from "../../core/middlewares/authMiddleware.js";
import express from "express";


const router = express.Router();


// Admin dashboard
router.get("/all-users", verifyToken, adminMiddleware , getAllUsersController);
router.get("/all-admins", verifyToken, adminMiddleware,  getAllAdminsController);
router.get("/all-sellers", verifyToken, adminMiddleware, getAllSelleresController);

// user
router.get("/me", verifyToken, getUserProfileController);
router.put("/me", verifyToken, updateUserProfileController);
router.delete("/me", verifyToken, deleteOwnAccountController);

// avatar
router.post("/upload-avatar", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), createAvatarController);
router.put("/upload-avatar", verifyToken, multerUpload([{ name: "profileImage", maxCount: 1 }]), updateAvatarProfileController);
router.delete("/upload-avatar", verifyToken, deleteAvatarController);

// multiple avatar
router.post("/upload-multiple-avatar", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), createMultipleAvatarController);
router.put("/upload-multiple-avatar", verifyToken, multerUpload([{ name: "multiProfileImage", maxCount: 5 },]), updateMultipleAvatarController);
router.delete("/upload-multiple-avatar", verifyToken,deleteMultipleAvatarController);

// file upload
router.post("/upload-file", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 },]),createUserPDFController);
router.put("/upload-file", verifyToken, multerUpload([{ name: "userPDF", maxCount: 1 },]),updateUserPDFController);
router.delete("/upload-file", verifyToken, deleteUserPDFController);

// admin user management
router.get("/:id", verifyToken, userAdminMiddleware, adminGetUserByIdController);
router.put("/:id", verifyToken, adminMiddleware, adminUpdateUserController);
router.delete("/:id", verifyToken, adminMiddleware, adminDeleteUserController);


export default router;



