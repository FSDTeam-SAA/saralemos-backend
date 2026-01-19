import CMS from "./cms.model.js";

import Blog from "./blog.model.js";
import Faq from "./faq.model.js";
import { cloudinaryUpload} from "../../lib/cloudinaryUpload.js";

export const uploadCmsAssetService = async ({ file, title, section,type }) => {
    if (!file) throw new Error("File is required");

    const folder = "admin-cms";
    const public_id = `cms/${Date.now()}-${file.originalname}`;

    const uploaded = await cloudinaryUpload(file.path, public_id, folder);

    if (typeof uploaded === "string" || !uploaded.secure_url) {
        throw new Error("Cloudinary upload failed");
    }

     //  delete duplicate banner from db if already exists
  if (section === "banner") {
    const existingBanner = await CMS.findOne({ section: "banner" });
    if (existingBanner) {
      await CMS.deleteOne({ _id: existingBanner._id });

      // delete from Cloudinary too
      // if (existingBanner.public_id) {
      //   await cloudinaryDelete(existingBanner.public_id); // <== you need to implement this
      // }
    }
  }

    const cmsEntry = await CMS.create({
        
        section,
        type: uploaded.resource_type === "video" ? "video" : "image",
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
    });

    return cmsEntry;
};

export const getAllCmsAssetsService = async (filter={}) => {
    return await CMS.find(filter).sort({ createdAt: -1 });
};

//update the cms 
export const updateCmsAssetService = async ({ id, file, section }) => {
  if (!id || !file || !section) {
    throw new Error("ID, file, and section are required");
  }

  const existing = await CMS.findById(id);
  if (!existing) {
    throw new Error("CMS entry not found");
  }

  // Upload new asset to Cloudinary
  const folder = "admin-cms";
  const public_id = `cms/${Date.now()}-${file.originalname}`;
  const uploaded = await cloudinaryUpload(file.path, public_id, folder);

  if (typeof uploaded === "string" || !uploaded.secure_url) {
    throw new Error("Cloudinary upload failed");
  }

  // Update CMS document with new details (old file stays on Cloudinary)
  existing.section = section;
  existing.type = uploaded.resource_type === "video" ? "video" : "image";
  existing.url = uploaded.secure_url;
  existing.public_id = uploaded.public_id;

  await existing.save();

  return existing;
};

export const getCmsAssetByIdService = async (id) => {
  if (!id) throw new Error("CMS asset ID is required");

  const cmsAsset = await CMS.findById(id);
  if (!cmsAsset) throw new Error("CMS asset not found");

  return cmsAsset;
};



export const deleteCmsAssetService = async (id) => {
  const asset = await CMS.findById(id);
  if (!asset) throw new Error("CMS asset not found");

 

  const deleted = await CMS.findByIdAndDelete(id);
  return deleted;
};


// Create Blog
export const createBlogService = async ({ title, description, thumbnail }) => {
  const blog = new Blog({
    title,
    description,
    thumbnail,
  });
  return await blog.save();
};

// Get all Blogs
export const getAllBlogsService = async () => {
  return await Blog.find().sort({ createdAt: -1 });
};

// Get single Blog by ID
export const getBlogByIdService = async (blogId) => {
  const blog = await Blog.findById(blogId);
  if (!blog) throw new Error("Blog not found");
  return blog;
};

// Update Blog
export const updateBlogService = async (blogId, updateData) => {
  const updated = await Blog.findByIdAndUpdate(blogId, updateData, { new: true });
  if (!updated) throw new Error("Blog not found");
  return updated;
};

// Delete Blog
export const deleteBlogService = async (blogId) => {
  const deleted = await Blog.findByIdAndDelete(blogId);
  if (!deleted) throw new Error("Blog not found or already deleted");
  return deleted;
};






// Create a new FAQ
export const createFaqService = async ({ question, answer }) => {
  const faq = await Faq.create({ question, answer });
  return faq;
};

// Get all FAQs
export const getAllFaqsService = async () => {
  return await Faq.find().sort({ createdAt: -1 });
};

// Get one FAQ by ID
export const getFaqByIdService = async (faqId) => {
  const faq = await Faq.findById(faqId);
  if (!faq) throw new Error("FAQ not found");
  return faq;
};

// Update FAQ
export const updateFaqService = async (faqId, updateData) => {
  const updated = await Faq.findByIdAndUpdate(faqId, updateData, { new: true });
  if (!updated) throw new Error("FAQ not found");
  return updated;
};

// Delete FAQ
export const deleteFaqService = async (faqId) => {
  const deleted = await Faq.findByIdAndDelete(faqId);
  if (!deleted) throw new Error("FAQ not found or already deleted");
  return deleted;
};


