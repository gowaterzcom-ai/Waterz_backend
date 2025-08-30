import mongoose, { ObjectId } from "mongoose";
import { AddonService,LocationType } from "../utils/trip";
import { PackageType } from "../utils/trip";

interface AddonServiceDetail {
  service: AddonService;
  pricePerHour: number;
}

export interface IYacht {
  owner: ObjectId;
  name: string;
  pickupat: string;
  isVerifiedByAdmin: string;
  location: LocationType;
  description: string;
  price: {
    sailing: {
      peakTime: number;
      nonPeakTime: number;
    };
    anchoring: {
      peakTime: number;
      nonPeakTime: number;
    };
  };
  addonServices: AddonServiceDetail[];
  availability: boolean;
  availabilityFrom: string;
  availabilityTo: string;
  amenities: string[];
  capacity: number;
  packageTypes: PackageType[];  
  mnfyear?: number;
  dimension?: string;
  crewCount?:number;
  images: string[];
  createdAt?: Date;
  YachtType: string;
  updatedAt?: Date;  
}

export const yachtSchema = new mongoose.Schema<IYacht>({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true }, // Yacht Owner
  name: { type: String, required: true },
  isVerifiedByAdmin: { 
    type: String, 
    enum: ["accepted", "requested", "denied"], 
    required: true, 
    default: "requested"
  },
  location: { 
    type: String, 
    enum: Object.values(LocationType),
    required: true 
  },
  pickupat: { type: String, required: true },
  YachtType: { type: String, required: true },
  availabilityFrom: { type: String, required: true },
  availabilityTo: { type: String, required: true },
  description: { type: String, required: true },
  price: {
    sailing: {
      peakTime: { type: Number, required: true },
      nonPeakTime: { type: Number, required: true }
    },
    anchoring: {
      peakTime: { type: Number, required: true },
      nonPeakTime: { type: Number, required: true }
    }
  },
  addonServices: [{
    service: { 
      type: String,
      enum: Object.values(AddonService),
      required: true 
    },
    pricePerHour: { 
      type: Number, 
      required: true 
    }
  }],
  availability: { type: Boolean, default: true },
  amenities: { type: [String], required: true }, // e.g., "AC", "WiFi"
  capacity: { type: Number, required: true },
  mnfyear: { type: Number },
  packageTypes: {
    type: [String],
    enum: Object.values(PackageType),
    required: true
  },
  dimension: { type: String },
  crewCount:  { type: Number, required: true }, // Array of crew objects
  images: { type: [String], required: true }, // Array of image URLs
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Yacht = mongoose.model<IYacht>('Yacht', yachtSchema);

export default Yacht;



//  availabilityTime:{
//     from: string;
//     to: string;
//   }

