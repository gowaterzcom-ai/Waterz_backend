import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    paymentGateway: { type: String, required: true }, // e.g., Stripe, Razorpay
    transactionId: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed'], 
      default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now },
  });
  
  export default mongoose.model('Payment', paymentSchema);