import mongoose from "mongoose";
import User from "../auth/auth.model.js";

const dimensionsSchema = new mongoose.Schema({
  value: { type: Number },
  unit: { type: String } // e.g., "m", "ft"
}, { _id: false });

const constructionsSchema = new mongoose.Schema({
  GRP: { type: Boolean, default: false },
  Steel: { type: Boolean, default: false },
  Aluminum: { type: Boolean, default: false },
  Wood: { type: Boolean, default: false },
  Composite: { type: Boolean, default: false },
}, { _id: false });

const additionalDetailSchema = new mongoose.Schema({
  section: { type: String, trim: true, default: 'Additional details' },
  label: { type: String, trim: true, required: true },
  value: { type: String, trim: true, required: true }
}, { _id: false });

const yachtListingSchema = new mongoose.Schema({
    userId:{type:String, ref:User},
  yachtName: { type: String, required: true },
  builder: { type: String },
  yachtType: { type: String },
  model: { type: String },
  location: { type: String },
  guestCapacity: { type: Number },
  Price: { type: Number },
  priceCurrency: { type: String, enum: ['$', '€', 'USD', 'EUR'] },
  bathRooms: { type: Number },
  bedRooms: { type: Number },
  cabins: { type: Number },
  crew: { type: Number },
  guests: { type: Number },
  constructions: constructionsSchema,
  yearBuilt: { type: Number },
  lengthOverall: dimensionsSchema,
  beam: dimensionsSchema,
  draft: dimensionsSchema,
  grossTons: { type: Number },
  engineMake: { type: String },
  engineModel: { type: String },
  // Flexible PDF specifications that do not fit the core listing fields.
  additionalDetails: { type: [additionalDetailSchema], default: [] },
  // Complete text returned by the PDF extractor. This is retained even when
  // AI matching cannot map every PDF value to a listing field.
  pdfExtractedText: { type: String, default: '' },
  images: [{ type: String }], // Cloudinary URLs
  description: { type: String },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const YachtListing = mongoose.model("YachtListing", yachtListingSchema);
