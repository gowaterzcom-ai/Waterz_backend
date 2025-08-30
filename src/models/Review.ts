import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    yacht: { type: mongoose.Schema.Types.ObjectId, ref: 'Yacht', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model('Review', reviewSchema);
  