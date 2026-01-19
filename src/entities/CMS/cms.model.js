import mongoose from "mongoose";





const cmsSchema = new mongoose.Schema(
  {
    title: { type: String },
    section: {
      type: String,
      required: true,
      enum: ["gallery", "hero", "sub-hero", "space-hero","experience-hero","updates-hero","contact-hero","banner", "footer"],
    },
    type: {
      type: String,
      enum: ["image", "video", "text"],

    },
    url: {
      type: String,
    },
    public_id: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },


   
  },
  { timestamps: true }
);

export default mongoose.model("CMS", cmsSchema);
