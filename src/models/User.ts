import mongoose from 'mongoose';
import { IYacht } from './Yacht';
import { IBooking } from './Booking';
import { profile } from 'console';


export interface IUser {
  googleId: string,
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'owner' | 'agent' | 'super-agent';
  phone: string;
  otp?: string;
  otpExpiresAt?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date; 
  bookings?: mongoose.Types.ObjectId[] | IBooking[];
}

export interface IOwner extends IUser{
  yachts: mongoose.Types.ObjectId[] | IYacht[];
}

export interface IAgent extends IUser {
  imgUrl?: string[];
  age?: number;
  DateOfBirth?: Date;
  experience?: number;
  address?: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  isVerifiedByAdmin: 'accepted' | 'requested' | 'denied';
  commissionRate?: number;
  superAgent?: IUser | string | null;
}

export interface ISuperAgent extends IAgent {
  agents: mongoose.Types.ObjectId[] | IAgent[];
  referralCode: string;
  isVerifiedByAdmin: 'accepted' | 'requested' | 'denied';
}

export interface IAdmin {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'owner' | 'agent' | 'super-agent';
  otp?: string;
  otpExpiresAt?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}



const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true, required:false },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'owner', 'agent', 'super-agent', 'admin'],
    required: true 
  },
  phone: { type: String, required: false },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Date, required: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }]
}, { timestamps: true });


const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'owner', 'agent', 'super-agent', 'admin'],
    required: true 
  },
  phone: { type: String, required: true },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Date, required: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  yachts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Yacht' }],
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }]
}, { timestamps: true });


const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'owner', 'agent', 'super-agent', 'admin'],
    required: true 
  },
  phone: { type: String, required: true },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Date, required: false },
  isVerified: { type: Boolean, default: false },
  isVerifiedByAdmin: { type: String, enum: ["accepted", "requested", "denied"], required: true },
  commissionRate: { type: Number, required: false }, 
  superAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  age: { type: Number, required: false },
  experience: { type: Number, required: false },
  address: { type: String, required: false },
  accountHolderName: { type: String, required: false },
  accountNumber: { type: String, required: false },
  bankName: { type: String, required: false },
  ifscCode: { type: String, required: false },
  imgUrl: {type: [String],default: [],},});

const superAgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'owner', 'agent', 'super-agent', 'admin'],
    required: true 
  },
  phone: { type: String, required: true },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Date, required: false },
  age: { type: Number, required: false },
  experience: { type: Number, required: false },
  address: { type: String, required: false },
  accountHolderName: { type: String, required: false },
  accountNumber: { type: String, required: false },
  bankName: { type: String, required: false },
  ifscCode: { type: String, required: false },
  imgUrl: {type: [String],default: [],},
  isVerifiedByAdmin: { type: String, enum: ["accepted", "requested", "denied"], default:"requested", required: true },
  isVerified: { type: Boolean, default: false },
  referralCode : { type: String, required: true },
  commissionRate: { type: Number,default:0, required: false}, // Commission in percentage
  agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }], // Managed Agents
  createdAt: { type: Date, default: Date.now },

});

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    otp: { type: String, required: false },
    role: { 
      type: String, 
      enum: ['customer', 'owner', 'agent', 'super-agent', 'admin'],
      required: true 
    },
    otpExpiresAt: { type: Date, required: false },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



// Create the models
const User = mongoose.model<IUser>('User', userSchema);
const Owner = mongoose.model<IOwner>('Owner', ownerSchema);
const Agent = mongoose.model<IAgent>('Agent', agentSchema);
const SuperAgent = mongoose.model<ISuperAgent>('SuperAgent', superAgentSchema);
const Admin = mongoose.model<IAdmin>('Admin', adminSchema);

export { Agent, Owner, SuperAgent , Admin};
export default User;

