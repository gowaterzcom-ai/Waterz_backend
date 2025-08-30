import mongoose from "mongoose";
import { AddonService } from '../utils/trip';
import { PackageType } from '../utils/trip';


export interface IBooking extends mongoose.Document {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  user: string;
  yacht: string;
  agent?: string;
  bookingDateTime?: Date;
  location: string;
  packages: PackageType;
  startDate: Date;
  startTime: Date;
  endDate: Date;
  images: string[];
  name: string;
  YachtType: string;
  promoCode?: string;
  otp?: string;
  capacity: number;
  PeopleNo: number;
  totalAmount: number;
  addonServices: {
    service: AddonService;
    hours: number;
  }[];  
  rideStatus: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  status: string;
  isAgentBooking: boolean;
  isAgentPaid: boolean;
  isSuperAgentPaid: boolean;
  calendarSync: boolean;
  createdAt: Date;
}

export interface IBookingAgent extends Omit<IBooking, 'yacht'> {
  yachts: string[];
  names: string[];
  images: string[]; 
  noOfYatchs: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  yacht: { type: mongoose.Schema.Types.ObjectId, ref: 'Yacht', required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null }, // Optional agent
  bookingDate: { type: Date, required: false },
  location: { type: String, required: true },
  packages: {
      type: String,
      enum: Object.values(PackageType),
      required: true
  },
  otp: { type: String, required: false },
  startDate: { type: Date, required: true },
  startTime: { type: Date, required: true },
  endDate: { type: Date, required: true },
  images: { type: [String], required: true },
  name: { type: String, required: true },
  YachtType: { type: String, required: false },
  addonServices: {
    type: [{
      type: String,
      enum: Object.values(AddonService)
    }],
    default: []
  },
  capacity: { type: Number, required: true },
  razorpayOrderId: { type: String, required: true },
  PeopleNo: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  isAgentBooking: { type: Boolean, default: false },
  isAgentPaid: { type: Boolean, default: false },
  isSuperAgentPaid: { type: Boolean, default: false },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  status: { 
    type: String, 
    enum: ['confirmed', 'canceled', 'completed'], 
    default: 'confirmed' 
  },
  rideStatus: { 
    type: String, 
    enum: ['pending', 'completed'], 
    default: 'pending'
  },
  calendarSync: { type: Boolean, default: false }, // To sync with external calendars
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const bookingAgentSchema = new mongoose.Schema({
  ...Object.fromEntries(Object.entries(bookingSchema.obj).filter(([key]) => key !== 'yacht')),
  yachts: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Yacht' }], required: true },
  noOfYatchs: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true }
});

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
const BookingAgent = mongoose.model<IBookingAgent>('BookingAgent', bookingAgentSchema);
export { BookingAgent };
export default Booking;