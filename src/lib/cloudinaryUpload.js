import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
// import { unlink } from "fs/promises";
import {
  cloudinaryApiKey,
  cloudinaryCloudName,
  cloudinarySecret
} from '../core/config/config.js';

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinarySecret
});

export const cloudinaryUpload = async (filePath, public_id, folder) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const extension = filePath.split('.').pop().toLowerCase();
    const isDocument = [
      'pdf',
      'docx',
      'doc',
      'xlsx',
      'xls',
      'ppt',
      'pptx'
    ].includes(extension);

    console.log(
      `Uploading file: ${filePath}, public_id: ${public_id}, folder: ${folder}`
    );

    const uploadImage = await cloudinary.uploader.upload(filePath, {
      resource_type: isDocument ? 'raw' : 'auto',
      public_id,
      folder
    });

    console.log(`Upload successful: ${uploadImage.secure_url}`);

    // Clean up local file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkError) {
      console.warn(
        `Could not delete local file ${filePath}:`,
        unlinkError.message
      );
    }

    return uploadImage;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    // Clean up local file even on error
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkError) {
      console.warn(
        `Could not delete local file ${filePath}:`,
        unlinkError.message
      );
    }
    throw error; // Re-throw error so caller can handle it
  }
};

export default cloudinary;
