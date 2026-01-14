import { generateResponse } from '../../lib/responseFormate.js';
import User from './auth.model.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import {
  loginUserService,
  refreshAccessTokenService,
  forgetPasswordService,
  verifyCodeService,
  resetPasswordService,
  changePasswordService,
  registerUserService
} from './auth.service.js';

export const registerUser = async (req, res, next) => {
  try {
    // Prepare payload from body
    const payload = { ...req.body };

    // Parse arrays from form-data (e.g., languagesSpoken[]=English)
    const arrayFields = [
      'languagesSpoken',
      'preferredToneOfVoice',
      'yachtTypesHandled',
      'primaryRegionsServed',
      'listingPlatformsUsed'
    ];
    arrayFields.forEach((field) => {
      if (payload[`${field}[]`]) {
        const values = Array.isArray(payload[`${field}[]`])
          ? payload[`${field}[]`]
          : [payload[`${field}[]`]];
        payload[field] = values;
        delete payload[`${field}[]`];
      }
    });

    // Parse nested socialLinks object from form-data (e.g., socialLinks[linkedin])
    const socialLinksObj = {};
    const socialKeys = [
      'linkedin',
      'instagram',
      'facebook',
      'youtube',
      'tiktok'
    ];
    socialKeys.forEach((key) => {
      const formKey = `socialLinks[${key}]`;
      if (payload[formKey]) {
        socialLinksObj[key] = payload[formKey];
        delete payload[formKey];
      }
    });
    if (Object.keys(socialLinksObj).length > 0) {
      payload.socialLinks = socialLinksObj;
    }

    // Parse address object if provided
    if (
      payload['address[country]'] ||
      payload['address[cityState]'] ||
      payload['address[roadArea]'] ||
      payload['address[postalCode]'] ||
      payload['address[taxId]']
    ) {
      payload.address = {
        country: payload['address[country]'] || '',
        cityState: payload['address[cityState]'] || '',
        roadArea: payload['address[roadArea]'] || '',
        postalCode: payload['address[postalCode]'] || '',
        taxId: payload['address[taxId]'] || ''
      };
      delete payload['address[country]'];
      delete payload['address[cityState]'];
      delete payload['address[roadArea]'];
      delete payload['address[postalCode]'];
      delete payload['address[taxId]'];
    }

    // If files are uploaded, push them to Cloudinary and map URLs
    const fileFields = ['profilePhoto', 'companyLogo', 'bannerImage'];
    if (req.files) {
      for (const field of fileFields) {
        const files = req.files[field];
        if (files && files.length > 0) {
          try {
            const file = files[0];
            const publicId = `${field}-${Date.now()}`;
            const folder = 'users';
            const uploaded = await cloudinaryUpload(
              file.path,
              publicId,
              folder
            );

            // Check if upload was successful
            if (
              uploaded &&
              typeof uploaded === 'object' &&
              (uploaded.secure_url || uploaded.url)
            ) {
              const url = uploaded.secure_url || uploaded.url;
              payload[field] = url;
              // keep compatibility for downstream consumers using profileImage
              if (field === 'profilePhoto' && url && !payload.profileImage) {
                payload.profileImage = url;
              }
            } else {
              console.warn(
                `Cloudinary upload failed or returned invalid response for ${field}:`,
                uploaded
              );
            }
          } catch (uploadError) {
            console.error(
              `Error uploading ${field} to Cloudinary:`,
              uploadError
            );
          }
        }
      }
    }

    const data = await registerUserService(payload);
    generateResponse(res, 201, true, 'Registered user successfully!', data);
  } catch (error) {
    console.error('Register error:', error);
    if (error.message === 'User already registered.') {
      generateResponse(res, 400, false, 'User already registered', null);
    } else if (error.message === 'Name, email and password are required') {
      generateResponse(
        res,
        400,
        false,
        'Name, email and password are required',
        null
      );
    } else {
      next(error);
    }
  }
};

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const data = await loginUserService({ email, password });
    generateResponse(res, 200, true, 'Login successful', data);
  } catch (error) {
    if (error.message === 'Email and password are required') {
      generateResponse(
        res,
        400,
        false,
        'Email and password are required',
        null
      );
    } else if (error.message === 'User not found') {
      generateResponse(res, 404, false, 'User not found', null);
    } else if (error.message === 'Invalid password') {
      generateResponse(res, 400, false, 'Invalid password', null);
    } else {
      next(error);
    }
  }
};

export const refreshAccessToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    const tokens = await refreshAccessTokenService(refreshToken);
    generateResponse(res, 200, true, 'Token refreshed', tokens);
  } catch (error) {
    if (error.message === 'No refresh token provided') {
      generateResponse(res, 400, false, 'No refresh token provided', null);
    } else if (error.message === 'Invalid refresh token') {
      generateResponse(res, 400, false, 'Invalid refresh token', null);
    } else {
      next(error);
    }
  }
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    await forgetPasswordService(email);
    generateResponse(
      res,
      200,
      true,
      'Verification code sent to your email',
      null
    );
  } catch (error) {
    if (error.message === 'Email is required') {
      generateResponse(res, 400, false, 'Email is required', null);
    } else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    } else {
      next(error);
    }
  }
};

export const verifyCode = async (req, res, next) => {
  const { otp, email } = req.body;
  try {
    await verifyCodeService({ otp, email });
    generateResponse(res, 200, true, 'Verification successful', null);
  } catch (error) {
    if (error.message === 'Email and otp are required') {
      generateResponse(res, 400, false, 'Email and otp is required', null);
    } else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    } else if (error.message === 'Otp not found') {
      generateResponse(res, 404, false, 'Otp not found', null);
    } else if (error.message === 'Invalid or expired otp') {
      generateResponse(res, 403, false, 'Invalid or expired otp', null);
    } else {
      next(error);
    }
  }
};

export const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  try {
    await resetPasswordService({ email, newPassword });
    generateResponse(res, 200, true, 'Password reset successfully', null);
  } catch (error) {
    if (error.message === 'Email and new password are required') {
      generateResponse(
        res,
        400,
        false,
        'Email and new password are required',
        null
      );
    } else if (error.message === 'Invalid email') {
      generateResponse(res, 400, false, 'Invalid email', null);
    } else if (error.message === 'otp not cleared') {
      generateResponse(res, 403, false, 'otp not cleared', null);
    } else {
      next(error);
    }
  }
};

export const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id;
  try {
    await changePasswordService({ userId, oldPassword, newPassword });
    generateResponse(res, 200, true, 'Password changed successfully', null);
  } catch (error) {
    if (error.message === 'Old and new passwords are required') {
      generateResponse(
        res,
        400,
        false,
        'Old and new passwords are required',
        null
      );
    } else if (error.message === 'Password does not match') {
      generateResponse(res, 400, false, 'Password does not match', null);
    } else {
      next(error);
    }
  }
};

export const logoutUser = async (req, res, next) => {
  const userId = req.user._id;
  try {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    generateResponse(res, 200, true, 'Logged out successfully', null);
  } catch (error) {
    next(error);
  }
};
