import { generateResponse } from '../../lib/responseFormate.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import {
  createTestimonial,
  getAllTestimonials,
  getActiveTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial
} from './testimonial.service.js';

// Create testimonial (Admin only)
export const createTestimonialController = async (req, res) => {
  try {
    const { name, rating, description } = req.body;

    if (!name || !rating || !description) {
      return generateResponse(
        res,
        400,
        false,
        'Name, rating, and description are required'
      );
    }

    if (rating < 1 || rating > 5) {
      return generateResponse(
        res,
        400,
        false,
        'Rating must be between 1 and 5'
      );
    }

    let imageUrl = '';
    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      const sanitizedName = `testimonial-${Date.now()}`;
      const uploadResult = await cloudinaryUpload(
        imageFile.path,
        sanitizedName,
        'testimonials'
      );
      imageUrl = uploadResult?.secure_url || '';
    }

    const testimonial = await createTestimonial({
      ...req.body,
      image: imageUrl
    });
    generateResponse(
      res,
      201,
      true,
      'Testimonial created successfully',
      testimonial
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

// Get all testimonials with pagination (Admin)
export const getAllTestimonialsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { testimonials, paginationInfo } = await getAllTestimonials({
      page,
      limit,
      search,
      date
    });
    generateResponse(res, 200, true, 'Testimonials fetched successfully', {
      testimonials,
      paginationInfo
    });
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

// Get active testimonials (Public)
export const getActiveTestimonialsController = async (req, res) => {
  try {
    const testimonials = await getActiveTestimonials();
    generateResponse(
      res,
      200,
      true,
      'Active testimonials fetched successfully',
      testimonials
    );
  } catch (err) {
    generateResponse(res, 500, false, err.message);
  }
};

// Get testimonial by ID
export const getTestimonialByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await getTestimonialById(id);
    generateResponse(
      res,
      200,
      true,
      'Testimonial fetched successfully',
      testimonial
    );
  } catch (err) {
    const status = err.message === 'Testimonial not found' ? 404 : 500;
    generateResponse(res, status, false, err.message);
  }
};

// Update testimonial (Admin only)
export const updateTestimonialController = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.rating && (req.body.rating < 1 || req.body.rating > 5)) {
      return generateResponse(
        res,
        400,
        false,
        'Rating must be between 1 and 5'
      );
    }

    let updateData = { ...req.body };

    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      const sanitizedName = `testimonial-${Date.now()}`;
      const uploadResult = await cloudinaryUpload(
        imageFile.path,
        sanitizedName,
        'testimonials'
      );
      updateData.image = uploadResult?.secure_url || '';
    }

    const updatedTestimonial = await updateTestimonial(id, updateData);
    generateResponse(
      res,
      200,
      true,
      'Testimonial updated successfully',
      updatedTestimonial
    );
  } catch (err) {
    const status = err.message === 'Testimonial not found' ? 404 : 500;
    generateResponse(res, status, false, err.message);
  }
};

// Delete testimonial (Admin only)
export const deleteTestimonialController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTestimonial(id);
    generateResponse(res, 200, true, 'Testimonial deleted successfully');
  } catch (err) {
    const status = err.message === 'Testimonial not found' ? 404 : 500;
    generateResponse(res, status, false, err.message);
  }
};
