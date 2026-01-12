import { generateResponse } from "../../lib/responseFormate.js";
import { 
  getAllUsers,
  getAllAdmins,
  getAllSellers,
  getUserById,
  updateUser,
  deleteUser,
  createAvatarProfile,
  updateAvatarProfile,
  deleteAvatarProfile,

  createMultipleAvatar,
  updateMultipleAvatar,
  deleteMultipleAvatar,
  
  createUserPDF,
  updateUserPDF,
  deleteUserPDF,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser

} from "./user.service.js";


export const getAllUsersController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { users, paginationInfo } = await getAllUsers({ page, limit, search, date });
    generateResponse(res, 200, true, 'Users fetched successfully', { users, paginationInfo });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch users', null);
  }
};


export const getAllAdminsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { admins, paginationInfo } = await getAllAdmins({ page, limit, search, date });
    generateResponse(res, 200, true, 'Admins fetched successfully', { admins, paginationInfo });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch admins', null);
  }
};


export const getAllSelleresController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { sellers, paginationInfo } = await getAllSellers({ page, limit, search, date });
    generateResponse(res, 200, true, 'Seller fetched successfully', { sellers, paginationInfo });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch seller', null);
  }
};


// User
export const getUserProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await getUserById(userId);
    generateResponse(res, 200, true, "User profile fetched successfully", user);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch user profile", null);
  }
};


export const updateUserProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedUser = await updateUser({ id: userId, ...req.body });
    generateResponse(res, 200, true, "User profile updated successfully", updatedUser);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to update profile", null);
  }
};


export const deleteOwnAccountController = async (req, res) => {
  try {
    const userId = req.user._id;
    await deleteUser(userId);
    generateResponse(res, 200, true, "Your account has been deleted", null);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to delete account", null);
  }
};


// admin user management
export const adminGetUserByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await adminGetUserById(id);
    generateResponse(res, 200, true, "User fetched successfully", user);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch user", null);
  }
};


export const adminUpdateUserController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await adminUpdateUser({ id, ...req.body });
    generateResponse(res, 200, true, "User updated successfully", updatedUser);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to update user", null);
  }
};


export const adminDeleteUserController = async (req, res) => {
  try {
    const { id } = req.params;
    await adminDeleteUser(id);
    generateResponse(res, 200, true, "User deleted successfully", null);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to delete user", null);
  }
};


export const createAvatarController = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.files?.profileImage) {
      return generateResponse(res, 400, false, 'Profile image is required');
    }

    const user = await createAvatarProfile(userId, req.files);
    generateResponse(res, 200, true, 'Avatar uploaded successfully', user);
  } catch (error) {
    console.error(error);
    const status = error.message.includes('not found') ? 404 : 500;
    const message = status === 500 ? 'Failed to upload avatar' : error.message;
    generateResponse(res, status, false, message);
  }
};


export const updateAvatarProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await updateAvatarProfile(userId, req.files);
    generateResponse(res, 200, true, 'Avatar updated successfully', user); 
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to update avatar', error.message);
  }
};


export const deleteAvatarController = async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedUser = await deleteAvatarProfile(userId);
    generateResponse(res, 200, true, 'Avatar deleted successfully', updatedUser);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to delete avatar', error.message);
  }
};


export const createMultipleAvatarController = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one avatar image is required');
    }

    const user = await createMultipleAvatar(userId, req.files); 
    generateResponse(res, 200, true, 'Multiple avatars uploaded successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to upload multiple avatars', null);
  }
};


export const updateMultipleAvatarController = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one avatar image is required');
    }

    const user = await updateMultipleAvatar(userId, req.files);
    generateResponse(res, 200, true, 'Multiple avatars updated successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to update multiple avatars', null);
  }
};


export const deleteMultipleAvatarController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await deleteMultipleAvatar(userId);
    generateResponse(res, 200, true, 'Multiple avatars deleted successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to delete multiple avatars', null);
  }
};


export const createUserPDFController = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one PDF is required');
    }

    const user = await createUserPDF(userId, req.files);
    generateResponse(res, 200, true, 'PDF uploaded successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to upload PDF', null);
  }
};


export const updateUserPDFController = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one PDF is required');
    }

    const user = await updateUserPDF(userId, req.files);
    generateResponse(res, 200, true, 'PDF updated successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to update PDF', null);
  }
};


export const deleteUserPDFController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await deleteUserPDF(userId);
    generateResponse(res, 200, true, 'PDF deleted successfully', user);
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, 'Failed to delete PDF', null);
  }
};




