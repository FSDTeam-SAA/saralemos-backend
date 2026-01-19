import asyncHandler from "express-async-handler";
import {
  uploadCmsAssetService,
  getAllCmsAssetsService,
  createBlogService,
  getAllBlogsService,
  getBlogByIdService,
  updateBlogService,
  deleteBlogService,
  createFaqService,
  getAllFaqsService,
  getFaqByIdService,
  updateFaqService,
  deleteFaqService,
  updateCmsAssetService,
  deleteCmsAssetService,
  getCmsAssetByIdService,
} from "../CMS/cms.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";




// POST /api/admin/cms/upload
export const uploadCmsAsset = asyncHandler(async (req, res) => {
  const { section ,type} = req.body;
  const files = req.files?.file;

  if (!section || !files || files.length === 0) {
    return generateResponse(res, 400, false, "Section and at least one file are required");
  }

  try {
    const uploadPromises = files.map((file) =>
      uploadCmsAssetService({ file, section })
    );

    const assets = await Promise.all(uploadPromises);

    generateResponse(res, 201, true, "CMS assets uploaded successfully", assets);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to upload CMS assets", error.message);
  }
});
export const updateCmsAsset = asyncHandler(async (req, res) => {
  const { section } = req.body;
  const files = req.files?.file;
  const id = req.params.id;

  if (!id || !section || !files || files.length === 0) {
    return generateResponse(res, 400, false, "ID, section, and file are required");
  }

  try {
    // handle multiple files gracefully if needed (assuming single file here)
    const file = Array.isArray(files) ? files[0] : files;

    const updatedAsset = await updateCmsAssetService({
      id,
      file,
      section,
    });

    generateResponse(res, 200, true, "CMS asset updated successfully", updatedAsset);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to update CMS asset", error.message);
  }
});






// GET /api/admin/cms
export const getAllCmsAssets = asyncHandler(async (req, res) => {

  const { section, type } = req.query;

  const filter = {};
  if (section) {
    filter.section = section;
  }
  if (type) filter.type = type;
  const assets = await getAllCmsAssetsService(filter);



  if (assets.length === 0) {
    generateResponse(res, 404, false, "No assets found for the given section");
  } else {
    generateResponse(res, 200, true, "Fetched assets", assets);
  }
})

export const getCmsAssetByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const cmsAsset = await getCmsAssetByIdService(id);
    generateResponse(res, 200, true, "Fetched CMS asset", cmsAsset);  
  } catch (error) {
   generateResponse(res, 404, false, "CMS asset not found", error.message);
  }
};

// DELETE /api/admin/cms/:id
export const deleteCmsAsset = asyncHandler(async (req, res) => {
  try {
    const deleted = await deleteCmsAssetService(req.params.id);
    generateResponse(res, 200, true, "CMS asset deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete CMS asset", error.message);
  }
});




//BLOG RETED CONTROLLERS
export const createBlog = async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    let thumbnail = null;

    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `blog_thumb_${Date.now()}`, "blogs/thumbnails");
      if (result?.secure_url) thumbnail = result.secure_url;
    }

    const blog = await createBlogService({ title, description, thumbnail });
    generateResponse(res, 201, true, "Blog created successfully", blog);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create blog", error.message);
  }
};


export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await getAllBlogsService();
    generateResponse(res, 200, true, "Fetched blogs", blogs);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch blogs", error.message);
  }
};


export const getBlogById = async (req, res) => {
  try {
    const blog = await getBlogByIdService(req.params.id);
    if (!blog) return generateResponse(res, 404, false, "Blog not found");
    generateResponse(res, 200, true, "Fetched blog", blog);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch blog", error.message);
  }
};


export const updateBlog = async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    let updateData = { title, description };

    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `blog_thumb_${Date.now()}`, "blogs/thumbnails");
      if (result?.secure_url) {
        updateData.thumbnail = result.secure_url;
      }
    }

    const updated = await updateBlogService(req.params.id, updateData, { new: true });

    if (!updated) return generateResponse(res, 404, false, "Blog not found");

    generateResponse(res, 200, true, "Blog updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update blog", error.message);
  }
};



export const deleteBlog = async (req, res) => {
  try {
    const deleted = await deleteBlogService(req.params.id);
    generateResponse(res, 200, true, "Blog deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete blog", error.message);
  }
};


// Create FAQ
export const createFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const faq = await createFaqService({ question, answer });
    generateResponse(res, 201, true, "FAQ created successfully", faq);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create FAQ", error.message);
  }
};


// Get all FAQs
export const getAllFaqs = async (req, res) => {
  try {
    const faqs = await getAllFaqsService();
    generateResponse(res, 200, true, "Fetched FAQs", faqs);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch FAQs", error.message);
  }
};


// Get single FAQ
export const getFaqById = async (req, res) => {
  try {
    const faq = await getFaqByIdService(req.params.id);
    if (!faq) return generateResponse(res, 404, false, "FAQ not found");
    generateResponse(res, 200, true, "Fetched FAQ", faq);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch FAQ", error.message);
  }
};


// Update FAQ
export const updateFaq = async (req, res) => {
  try {
    const updated = await updateFaqService(req.params.id, req.body);
    generateResponse(res, 200, true, "FAQ updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update FAQ", error.message);
  }
};


// Delete FAQ
export const deleteFaq = async (req, res) => {
  try {
    const deleted = await deleteFaqService(req.params.id);
    generateResponse(res, 200, true, "FAQ deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete FAQ", error.message);
  }
};

