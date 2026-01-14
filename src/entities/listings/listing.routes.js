import express from "express";

import { multerUpload } from "../../core/middlewares/multer.js";
import { createYachtListing, deleteYachtListingById, extractListingFromPdf, getAllYachtListings, getYachtListingById, updateYachtListingById } from "./listingExtract.controller.js";
import { userMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/extract-pdf",
  multerUpload([
  { name: "pdf", maxCount: 1 }]),
  extractListingFromPdf
);
router.post("/create", verifyToken,userMiddleware,multerUpload([{name:"images"}]),createYachtListing);
router.get("/all", verifyToken,userMiddleware, getAllYachtListings);
router.get("/:id", getYachtListingById);
router.put("/:id", verifyToken,userMiddleware,multerUpload([{name:"images"}]),updateYachtListingById);
router.delete("/:id",verifyToken,userMiddleware ,deleteYachtListingById);
export default router;
