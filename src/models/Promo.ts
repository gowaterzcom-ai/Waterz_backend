import mongoose, { Schema } from "mongoose";
import { Types } from "mongoose";
export interface IPromo extends mongoose.Document {
  code: string;
  description: string;
  validFor: "agent" | "customer" | "all";
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  targetedUsers?: {
    userIds: Types.ObjectId[];
    userType: "agent" | "customer";
    userModel: "User" | "Agent"; 
  };
  userUsage: {
    userId: mongoose.Types.ObjectId;
    usageCount: number;
  }[];
  maxUsagePerUser: number;
  totalUsageLimit: number;
  totalUsageCount: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
}

const PromoSchema = new Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  validFor: { 
    type: String, 
    enum: ["agent", "customer", "all"], 
    required: true 
  },
  discountType: {
    type: String,
    enum: ["PERCENTAGE", "FIXED"],
    required: true
  },
  discountValue: { type: Number, required: true },
  targetedUsers: {
    userIds: [{ 
      type: Schema.Types.ObjectId,
      refPath: 'targetedUsers.userModel' // Dynamic reference
    }],
    userType: { 
      type: String, 
      enum: ["agent", "customer"] 
    },
    userModel: {
      type: String,
      enum: ["User", "Agent"],
      required: function(this: any) {
        return !!this.targetedUsers?.userIds?.length;
      }
    }
  },
  userUsage: [{
    userId: { type: Schema.Types.ObjectId, refPath: 'targetedUsers.userType'},
    usageCount: { type: Number, default: 0 }
  }],
  maxUsagePerUser: { type: Number, required: true },
  totalUsageLimit: { type: Number, required: true },
  totalUsageCount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Validation method for user eligibility
PromoSchema.methods.isValidForUser = async function(
  userId: Types.ObjectId,
  userType: "agent" | "customer"
): Promise<boolean> {
  // 1. Check if promo is active and not expired
  if (!this.isActive || new Date() > this.expiryDate) {
    return false;
  }

  // 2. Check total usage limit
  if (this.totalUsageCount >= this.totalUsageLimit) {
    return false;
  }

  // 3. Check user type validity
  if (this.validFor !== "all" && this.validFor !== userType) {
    return false;
  }

  // 4. Check targeted users if specified
  if (this.targetedUsers?.userIds?.length > 0) {
    const validUser = await mongoose.model(this.targetedUsers.userModel)
      .findOne({ _id: userId });
    if (!validUser || this.targetedUsers.userType !== userType) {
      return false;
    }
  }

  // 5. Check user usage limit
  //@ts-ignore
  const userUsage = this.userUsage.find(u => u.userId.equals(userId));
  if (userUsage && userUsage.usageCount >= this.maxUsagePerUser) {
    return false;
  }

  return true;
};

export const Promo = mongoose.model<IPromo>("Promo", PromoSchema);