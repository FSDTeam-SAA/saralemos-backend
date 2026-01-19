import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Faq", faqSchema);
