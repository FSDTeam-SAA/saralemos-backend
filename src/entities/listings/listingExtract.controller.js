import { extractPdfData } from "../../lib/adobeExtract.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import { matchListingFieldsWithGPT } from "../../lib/gptMathc.js";
import { createFilter, createPaginationInfo } from "../../lib/pagination.js";
import { saveImageBufferToDisk } from "../../lib/saveImageTemp.js";
import { YachtListing } from "./listing.model.js";
import fs from 'fs'

export const extractListingFromPdf = async (req, res) => {
  try {
      // Check for uploaded PDF
    if (!req.files?.pdf?.[0]) {
      return res.status(400).json({ message: "PDF file required" });
    }

    const pdfFile = req.files.pdf[0]; // Access the first file
    const pdfPath = pdfFile.path;

    // 1️⃣ Adobe Extract
    const { extractedText, images } = await extractPdfData(pdfPath);

    // 2️⃣ GPT Field Matching
    const matchedData =
      await matchListingFieldsWithGPT(extractedText);

    // 3️⃣ Upload extracted images to Cloudinary
    const imageUrls = [];

    for (const img of images) {
      const tempPath = saveImageBufferToDisk(
        img.buffer,
        img.name
      );

      const uploaded = await cloudinaryUpload(
        tempPath,
        undefined,
        "yacht-listings"
      );

      if (uploaded?.secure_url) {
        imageUrls.push(uploaded.secure_url);
      }
    }

    // 4️⃣ Response for UI (preview + edit)
    res.json({
      success: true,
      extractedText,
      matchedData,
      images: imageUrls
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "PDF extraction failed",
      error: err.message
    });
  }
};



// Middleware to extract user from token (example placeholder)
const getUserFromToken = (req) => req.user?._id; // assume auth middleware sets req.user

// 1️⃣ Create Listing
export const createYachtListing = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
 // 2️⃣ Parse nested JSON fields
    const constructions = req.body.constructions
      ? JSON.parse(req.body.constructions)
      : {};
    const lengthOverall = req.body.lengthOverall
      ? JSON.parse(req.body.lengthOverall)
      : undefined;
    const beam = req.body.beam ? JSON.parse(req.body.beam) : undefined;
    const draft = req.body.draft ? JSON.parse(req.body.draft) : undefined;
    

    let imageUrls = [];

    // 1️⃣ Check for uploaded files first
   if (req.files?.images?.length) {
  for (const file of req.files.images) {
    let tempPath;
    if (file.buffer) {
      tempPath = saveImageBufferToDisk(file.buffer, file.originalname);
    } else if (file.path) {
      tempPath = file.path;
    }
    const uploaded = await cloudinaryUpload(tempPath, undefined, "yacht-listings");
    if (uploaded?.secure_url) imageUrls.push(uploaded.secure_url);

    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
} 
// 2️⃣ If no files, parse images from body
else if (req.body.images) {
  if (typeof req.body.images === "string") {
    try {
      // Remove extra whitespace
      const str = req.body.images.trim();

      // Parse only valid JSON arrays
      if (str.startsWith("[") && str.endsWith("]")) {
        imageUrls = JSON.parse(str);
      } else {
        // Single URL sent as string
        imageUrls = [str];
      }
    } catch (err) {
      console.warn("Failed to parse images array:", err.message);
      imageUrls = [];
    }
  } else if (Array.isArray(req.body.images)) {
    imageUrls = req.body.images;
  }
}

    
    // 3️⃣ Create the listing
    const listing = await YachtListing.create({
      ...req.body,
        constructions,
      lengthOverall,
      beam,
      draft,
      
      images: imageUrls,
      createdBy: userId
    });

    res.status(201).json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// 2️⃣ Get All Listings (optionally filter by user)
// Get All Listings with Filter & Pagination
export const getAllYachtListings = async (req, res) => {
  try {
    const userId = req.user._id; // assume auth middleware sets req.user
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { page = 1, limit = 10, search, date } = req.query;

    // 1️⃣ Build filter
    const filter = createFilter(search, date);

    // Include only this user's active listings
    filter.createdBy = userId;
    filter.isActive = true;

    // 2️⃣ Count total documents
    const totalData = await YachtListing.countDocuments(filter);

    // 3️⃣ Fetch paginated data
    const listings = await YachtListing.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * Number.parseInt(limit))
      .limit(Number.parseInt(limit));

    // 4️⃣ Pagination info
    const pagination = createPaginationInfo(Number.parseInt(page), Number.parseInt(limit), totalData);

    res.json({ success: true, listings, pagination });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3️⃣ Get Listing by ID
export const getYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await YachtListing.findById(id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4️⃣ Update Listing by ID
export const updateYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserFromToken(req);
    if (!userId)
      return res.status(401).json({ message: "Unauthorized" });

    // 1️⃣ Parse nested JSON fields if they exist
    const constructions = req.body.constructions
      ? JSON.parse(req.body.constructions)
      : undefined;
    const lengthOverall = req.body.lengthOverall
      ? JSON.parse(req.body.lengthOverall)
      : undefined;
    const beam = req.body.beam ? JSON.parse(req.body.beam) : undefined;
    const draft = req.body.draft ? JSON.parse(req.body.draft) : undefined;

    // 2️⃣ Handle images
    let imageUrls = [];

    // 2a. If files uploaded
    if (req.files?.images?.length) {
      for (const file of req.files.images) {
        let tempPath;
        if (file.buffer) tempPath = saveImageBufferToDisk(file.buffer, file.originalname);
        else if (file.path) tempPath = file.path;

        const uploaded = await cloudinaryUpload(tempPath, undefined, "yacht-listings");
        if (uploaded?.secure_url) imageUrls.push(uploaded.secure_url);

        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
    // 2b. If images sent in body (string or array)
    else if (req.body.images) {
      try {
        if (typeof req.body.images === "string") {
          imageUrls = JSON.parse(req.body.images);
        } else if (Array.isArray(req.body.images)) {
          imageUrls = req.body.images;
        }
      } catch (err) {
        console.warn("Failed to parse images array:", err.message);
        imageUrls = [];
      }
    }
    if (imageUrls.length > 0) {
  const existingListing = await YachtListing.findById(id);
  imageUrls = [...(existingListing.images || []), ...imageUrls];
}

    // 3️⃣ Build update object
    const updateData = {
      ...req.body,
      constructions,
      lengthOverall,
      beam,
      draft,
      images: imageUrls.length ? imageUrls : undefined, // only update if we have images
    };

    // Remove undefined fields to avoid overwriting
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // 4️⃣ Update the listing
    const listing = await YachtListing.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { $set: updateData },
      { new: true }
    );

    if (!listing)
      return res
        .status(404)
        .json({ message: "Listing not found or unauthorized" });

    res.json({ success: true, listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5️⃣ Delete Listing by ID (soft delete)
export const deleteYachtListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const listing = await YachtListing.findOneAndDelete(
      { _id: id, createdBy: userId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!listing) return res.status(404).json({ message: "Listing not found or unauthorized" });
    res.json({ success: true, message: "Listing deleted", listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
