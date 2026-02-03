import { createFilter, createPaginationInfo } from '../../lib/pagination.js';
import Testimonial from './testimonial.model.js';

// Create testimonial
export const createTestimonial = async (data) => {
  return await Testimonial.create(data);
};

// Get all testimonials with pagination
export const getAllTestimonials = async ({
  page = 1,
  limit = 10,
  search,
  date
}) => {
  const filter = createFilter(search, date);
  const totalTestimonials = await Testimonial.countDocuments(filter);
  const testimonials = await Testimonial.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalTestimonials);
  return { testimonials, paginationInfo };
};

// Get active testimonials (for public display)
export const getActiveTestimonials = async () => {
  return await Testimonial.find({ isActive: true }).sort({ createdAt: -1 });
};

// Get testimonial by ID
export const getTestimonialById = async (id) => {
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    throw new Error('Testimonial not found');
  }
  return testimonial;
};

// Update testimonial
export const updateTestimonial = async (id, data) => {
  const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });

  if (!updatedTestimonial) {
    throw new Error('Testimonial not found');
  }
  return updatedTestimonial;
};

// Delete testimonial
export const deleteTestimonial = async (id) => {
  const deletedTestimonial = await Testimonial.findByIdAndDelete(id);
  if (!deletedTestimonial) {
    throw new Error('Testimonial not found');
  }
  return true;
};
