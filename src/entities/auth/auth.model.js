import RoleType from '../../lib/types.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  accessTokenExpires,
  accessTokenSecrete,
  refreshTokenExpires,
  refreshTokenSecrete
} from '../../core/config/config.js';

const AddressSchema = new mongoose.Schema(
  {
    country: { type: String, default: '' },
    cityState: { type: String, default: '' },
    roadArea: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    taxId: { type: String, default: '' }
  },
  { _id: false }
);

// Social links for user's public profile / portfolio
const SocialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, default: '' },
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  { _id: false }
);
const FacebookPageSchema = new mongoose.Schema(
  {
    pageId: { type: String, required: true }, // Facebook Page ID
    pageName: { type: String, required: true }, // Page name
    pageAccessToken: { type: String, required: true }, // Long-lived access token for the page
    adAccountId: { type: String }, // Ad account linked to this page
    instagramBusinessId: { type: String, default: null }, // Instagram Business ID if linked
    tasks: [{ type: String }] // Permissions/tasks for the page
  },
  { _id: false }
);

const FacebookAdAccountSchema = new mongoose.Schema(
  {
    account_id: { type: String, required: true },
    id: { type: String, required: true },
    name: { type: String, default: '' },
    currency: { type: String, default: '' }
  },
  { _id: false }
);

// Facebook Business Sub-schema
const FacebookBusinessSchema = new mongoose.Schema(
  {
    businessId: { type: String, required: true },
    businessName: { type: String, required: true },
    pages: [FacebookPageSchema], // Reuse your existing page schema
    adAccounts: [FacebookAdAccountSchema]
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    /* =====================
       AUTH & BASIC INFO
    ====================== */
    // Backward-compat primary name
    name: { type: String, trim: true },
    // New structured name fields
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true },
    username: { type: String },
    phoneNumber: { type: String, default: '' },

    dob: { type: Date, default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male'
    },

    adAccountId: { type: String, default: null },
    pageAccessToken: { type: String, default: null },
    instagramAccountId: { type: String, default: null },
    facebookConnectedAt: { type: Date, default: null },
    facebookPages: [FacebookPageSchema],
    facebookBusinesses: [FacebookBusinessSchema],

    /* =====================
       PROFESSIONAL DETAILS
    ====================== */
    jobTitle: { type: String, default: '' },
    companyName: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    industryExperience: { type: String, default: '' },
    languagesSpoken: { type: [String], default: [] },

    /* =====================
       MEDIA
    ====================== */
    // Existing profile image fields
    profileImage: { type: String, default: '' },
    multiProfileImage: { type: [String], default: [] },
    pdfFile: { type: String, default: '' },
    // New media fields
    profilePhoto: { type: String, default: '' },
    companyLogo: { type: String, default: '' },
    bannerImage: { type: String, default: '' },

    /* =====================
       SOCIAL & CONTENT
    ====================== */
    socialLinks: { type: SocialLinksSchema, default: () => ({}) },
    preferredToneOfVoice: {
      type: [String],
      // enum: [
      //   'Luxury',
      //   'Professional',
      //   'Friendly',
      //   'Technical',
      //   'Sophisticated',
      //   'Approachable',
      //   'Expert',
      //   'Conversational'
      // ],
      default: []
    },
    postingFrequency: { type: String, default: '' },

    /* =====================
       YACHT BUSINESS INFO
    ====================== */
    yachtTypesHandled: { type: [String], default: [] },
    averagePriceRange: {
      type: String,
      default: null
    },
    primaryRegionsServed: { type: [String], default: [] },
    listingPlatformsUsed: { type: [String], default: [] },

    /* =====================
       PORTFOLIO
    ====================== */
    customHeadline: { type: String, default: '' },
    portfolioPageSlug: { type: String, unique: true, sparse: true },
    qrCodeUrl: { type: String, default: '' },

    /* =====================
       SYSTEM FLAGS
    ====================== */
    role: {
      type: String,
      default: RoleType.USER,
      enum: [RoleType.USER, RoleType.ADMIN]
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    stripeAccountId: { type: String, default: null },

    bio: { type: String, default: '' },
    address: { type: AddressSchema, default: () => ({}) },

    otp: {
      type: String,
      default: null
    },

    otpExpires: {
      type: Date,
      default: null
    },

    otpVerified: {
      type: Boolean,
      default: false
    },

    resetExpires: {
      type: Date,
      default: null
    },

    // isVerified moved to System Flags above (kept for compatibility)

    refreshToken: {
      type: String,
      default: ''
    },


    hasActiveSubscription: { type: Boolean, default: false },
    subscriptionExpireDate: { type: Date, default: null },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    language: { type: String, default: 'en' }
  },
  { timestamps: true }
);

// Hashing password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const hashedPassword = await bcrypt.hash(this.password, 10);

  this.password = hashedPassword;
  next();
});

// Password comparison method (bcrypt)
UserSchema.methods.comparePassword = async function (id, plainPassword) {
  const { password: hashedPassword } =
    await User.findById(id).select('password');

  const isMatched = await bcrypt.compare(plainPassword, hashedPassword);

  return isMatched;
};

// Generate ACCESS_TOKEN
UserSchema.methods.generateAccessToken = function (payload) {
  return jwt.sign(payload, accessTokenSecrete, {
    expiresIn: accessTokenExpires
  });
};

// Generate REFRESH_TOKEN
UserSchema.methods.generateRefreshToken = function (payload) {
  return jwt.sign(payload, refreshTokenSecrete, {
    expiresIn: refreshTokenExpires
  });
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
