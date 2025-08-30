import  User, {  Agent, IAgent, IOwner, IUser, Owner, IAdmin, ISuperAgent,SuperAgent, Admin  }  from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import EmailService from "./emailService";
import dotenv from "dotenv";
import {findRoleById} from "../utils/role";
import Yacht, { IYacht } from "../models/Yacht";
import Booking, {IBooking} from "../models/Booking"; 
import {AdminFilter,ApprovedDetails,agentCommission,superAgentCommission,AdminFilterBooking,AdminCustomerFilter,AdminSuperAgentFilter,AdminEarningFilter,AdminDashboardFilter} from "../controllers/userController";
import {Promo,IPromo} from "../models/Promo";
import Query from "../models/Query";
import sgMail from '@sendgrid/mail';
import SMSService from "./smsService";


dotenv.config();
const OTP_JWT_SECRET = process.env.OTP_JWT_SECRET as string;
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export interface IUserAuthInfo {
  user: IUser | IAdmin;
  token: string;
}

interface BookingDataPoint {
  month: string;
  totalBookings: number;
  customerBookings: number;
  agentBookings: number;
  year?: string;
}

interface EarningDataPoint {
  month: string;
  amount: number;
  year?: string;
}

interface DashboardResponse {
  bookings: {
    data: BookingDataPoint[];
    total: number;
    byCustomer: number;
    byAgent: number;
  };
  earnings: {
    data: EarningDataPoint[];
    total: number;
  };
  distribution: {
    bookings: {
      customerPercentage: number;
      agentPercentage: number;
      customerValue: number;
      agentValue: number;
    };
    earnings: {
      customerPercentage: number;
      agentPercentage: number;
      customerValue: number;
      agentValue: number;
    };
  };
}

export interface Payments{
  payStatus: boolean;
  bookingId: string;
  bookingDate: Date;
  commissionAmount:  number;
}


export interface Filter {
  status: "pending" | "completed" | "All" |string;
  agentWise: "All" | string
}
interface AgentWithBookings {
  agent: IAgent | null;
  totalBookings: number;
}

class UserprofileService{

  static async updatePhone(userId: string, newPhone: string, newName: string): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(userId, { phone: newPhone, name: newName }, { new: true });
    } catch (error) {
      throw new Error("Error updating phone number: " + (error as Error).message);
    }
  }

  static async updateOwnerProfile(userId: string, newPhone: string, newName: string): Promise<IUser | null> {
    try {
      return await Owner.findByIdAndUpdate(userId, { name: newName, phone: newPhone  }, { new: true });
    } catch (error) {
      throw new Error("Error updating phone number: " + (error as Error).message);
    }
  }

// customer
  static async meCustomer(userId: string): Promise<IBooking[] | null> {
    try {
      return await User.findById(userId);
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }

  static async customerCurrentRides(userId: string): Promise<IBooking[] | null> {
    try {
      const bookings = await Booking.find({ user: userId, rideStatus: 'pending',paymentStatus: 'completed' });
      return bookings;
    } catch (error) {
      throw new Error("Error getting previous rides: " + (error as Error).message);
    }
  }

  static async customerPrevRides(userId: string): Promise<IBooking[] | null> {
    try {
      const bookings = await Booking.find({ user: userId, rideStatus: 'completed' });
      return bookings;
    } catch (error) {
      throw new Error("Error getting previous rides: " + (error as Error).message);
    }
  }

  static async customerPrevRidesId(userId: string, bookingId: string): Promise<IBooking | null> {
    try {
      const booking = await Booking.findOne({ _id: bookingId, user: userId });
      return booking;
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }

  // owner
  static async meOwner(userId: string): Promise<IUser | null> {
    try {
      return await Owner.findById(userId);
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }

  static async ownerCurrentRides(userId: string): Promise<IBooking[] | null> {
    try {
      console.log("Searching for owner ID:", userId);
  
      // Get owner's yachts with explicit select
      const ownerYachts = await Yacht.find({ owner: userId });
      console.log("Owner's yachts found:", ownerYachts.map(y => y._id));
  
      if (ownerYachts.length === 0) {
        console.log("No yachts found for owner:", userId);
        return [];
      }
  
      const yachtIds = ownerYachts.map(yacht => yacht._id);
  
      // Modified query with full debug logging
      const bookings = await Booking.find({ 
        yacht: { $in: yachtIds },
        paymentStatus : "completed", 
        $or: [
          { rideStatus: 'pending' },
          { rideStatus: { $exists: false } },
        ]
      }).populate({
        path: 'yacht',
        populate: {
          path: 'owner'
        }
      }).populate('user');
  
      console.log("Query parameters:", {
        yachtIds,
        ownerUserId: userId
      });
      
      console.log("Found bookings:", 
        bookings.map(b => ({
          id: b._id,
          yachtId: b.yacht,
          status: b.status,
          rideStatus: b.rideStatus
        }))
      );
  
      return bookings;
    } catch (error) {
      console.error("Error in ownerCurrentRides:", error);
      throw new Error("Error getting current rides: " + (error as Error).message);
    }
  }

  static async ownerPrevRides(userId: string): Promise<IBooking[] | null> {
    try {
      // First, get all yachts owned by this owner
      const ownerYachts = await Yacht.find({ owner: userId });
      const yachtIds = ownerYachts.map(yacht => yacht._id);
      
      // Then find all completed bookings for these yachts
      const bookings = await Booking.find({ 
        yacht: { $in: yachtIds },
        rideStatus: 'completed'
      }).populate('yacht user'); // Optionally populate yacht and user details
      
      return bookings;
    } catch (error) {
      throw new Error("Error getting previous rides: " + (error as Error).message);
    }
  }

  static async ownerPrevRidesId(userId: string, bookingId: string): Promise<IBooking | null> {
    try {
        const booking = await Booking.findOne({ 
        _id: bookingId,
        owner : userId,
      })
      return booking;
    } catch (error) {
      throw new Error("Error getting previous ride: " + (error as Error).message);
    }
  }

  // agent
  static async meAgent(userId: string): Promise<IUser | null> {
    try {
      return await Agent.findById(userId);
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }

  }
  
  static async updateAgentProfile(userId: string, userData: Partial<IAgent>): Promise<IAgent | null> {
    try {
      const { age,experience,address,accountHolderName,accountNumber,bankName,ifscCode,imgUrl } = userData;
      return await Agent.findByIdAndUpdate(userId, {
        age,
        experience,
        address,
        accountHolderName,
        accountNumber,
        bankName,
        ifscCode,
        imgUrl
      }, { new: true });
    } catch (error) {
      throw new Error("Error updating user: " + (error as Error).message);
    }
  }

  static async agentCurrentRides(userId: string): Promise<IBooking[] | null> {
    try {
      const bookings = await Booking.find({ user: userId, rideStatus: 'pending',paymentStatus: 'completed' });
      return bookings;
    } catch (error) {
      throw new Error("Error getting current rides: " + (error as Error).message);
    }
  }
  

static async getCommissionDetails(): Promise<{ agents: any[]; superAgents: any[] }> {
  try {
    // Fetch commission details for agents with status accepted
    const agents = await Agent.find({ isVerifiedByAdmin: "accepted" }).select("name commissionRate");
    // Fetch commission details for super agents with status accepted
    const superAgents = await SuperAgent.find({ isVerifiedByAdmin: "accepted" }).select("name commissionRate");

    console.log("Agents commission details:", agents);
    console.log("Super Agents commission details:", superAgents);

    return {
      agents,
      superAgents
    };
  } catch (error) {
    throw new Error("Error getting commission details: " + (error as Error).message);
  }
}

  static async agentPrevRides(userId: string): Promise<IBooking[] | null> {
    try {
      const bookings = await Booking.find({ user: userId, rideStatus: 'completed' });
      return bookings;
    } catch (error) {
      throw new Error("Error getting previous rides: " + (error as Error).message);
    }
  }
  
  // superAgent
  static async meSuperAgent(userId: string): Promise<IUser | null> {
    try {
      return await SuperAgent.findById(userId);
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }

  static async createRefferal(userId: string): Promise<string> {
    try {
      // Find superagent by ID
      const superAgent = await SuperAgent.findById(userId) 
      if (!superAgent) {
        throw new Error("Agent not found");
      }
  
      // Generate unique referral code if not exists
      if (!superAgent.referralCode) {
        const referralCode = `${superAgent.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8)}`;
        superAgent.referralCode = referralCode;
        await superAgent.save();
      }
  
      // Generate full referral URL
      const baseUrl = process.env.AGENT_FRONTEND_URL || 'https://www.agent.gowaterz.com';
      const referralUrl = `${baseUrl}/signup?referral=${superAgent.referralCode}`;
  
      return referralUrl;
  
    } catch (error) {
      throw new Error(`Error creating referral: ${(error as Error).message}`);
    }
  }

  static async listAllAgent(userId: string): Promise<IAgent[] | null> {
    try {
      const agents = await Agent.find({ superAgent: userId });
      return agents;
    } catch (error) {
      throw new Error("Error getting agents: " + (error as Error).message);
    }
  }

  static async agentDetail(userId: string): Promise<AgentWithBookings | null> {
    try {
      // Get agent details
      const agent = await Agent.findById(userId);
      // Get bookings count for this agent
      const bookings = await Booking.find({ agentId: userId });
      const totalBookings = bookings.length;
      // Return combined response
      return {
        agent,
        totalBookings
      };
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }
  
  static async paymentDetail(userId: string): Promise<IUser | null> {
    try {
      return await User.findById(userId);
    } catch (error) {
      throw new Error("Error getting user: " + (error as Error).message);
    }
  }

  static async updateSuperAgentProfile(userId: string, userData: Partial<ISuperAgent>): Promise<IUser | null> {
    try {
      const { age,experience,address,accountHolderName,accountNumber,bankName,ifscCode,imgUrl } = userData;
      return await SuperAgent.findByIdAndUpdate(userId, {
        age,
        experience,
        address,
        accountHolderName,
        accountNumber,
        bankName,
        ifscCode,
        imgUrl
      }, { new: true });
    } catch (error) {
      throw new Error("Error updating user: " + (error as Error).message);
    }
  }

  static async deleteAgent(agentId: string): Promise<IAgent | null> {
    try {
      return await Agent.findByIdAndDelete(agentId);
    } catch (error) {
      throw new Error("Error deleting agent: " + (error as Error).message);
    }
  }

  static async listFilteredAgent(userId: string, filter: Filter): Promise<IBooking[]> {
    try {
      // Set default values if not provided
      const filterWithDefaults = {
        status: filter.status || "All",
        agentWise: filter.agentWise || "All",
      };
      console.log("Filter with defaults:", filterWithDefaults);
  
      // 1. Get all agents under this superAgent
      const agents = await Agent.find({ superAgent: userId });
      if (agents.length === 0) {
        console.log("No agents found for superAgent:", userId);
        return [];
      }
  
      // 2. Build base query
      let query: any = {};
  
      // 3. Apply agent filter with fixed comparison
      if (filterWithDefaults.agentWise === "All") {
        query.agent = { $in: agents.map(agent => agent._id) };
        console.log("Query filtering on all agents:", query.agent);
      } else {
        const agentExists = agents.some(agent =>
          agent._id.toString() === filterWithDefaults.agentWise.toString()
        );
  
        if (!agentExists) {
          console.error("Selected agent does not belong to this superAgent. Agent ID in filter:", filterWithDefaults.agentWise);
          throw new Error('Selected agent does not belong to this superAgent');
        }
        query.agent = filterWithDefaults.agentWise;
      }
  
      // 4. Apply status and payment status filters
      if (filterWithDefaults.status === "All" || filterWithDefaults.status.trim() === "") {
        query.rideStatus = { $in: ["pending", "completed"] };
      } else {
        query.rideStatus = filterWithDefaults.status;
      }
      query.paymentStatus = "completed";
  
      // Debug: Log final query
      console.log("Final query object:", JSON.stringify(query));
  
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .populate('agent');
  
      console.log("Bookings retrieved:", bookings);
      return bookings;
  
    } catch (error) {
      console.error("Error in listFilteredAgent:", error);
      throw error;
    }
  }

  static async listFilteredEarnings(userId: string, filter: Partial<{ agentWise: string }>): Promise<number> {
    try {
      // 1. Get all agents under this superAgent
      const agents = await Agent.find({ superAgent: userId });
      if (!agents.length) {
        console.log("No agents found for superAgent:", userId);
        return 0;
      }
    
      // 2. Build base query to get completed bookings
      let query: any = {};
      // Treat empty string or 'All' as all agents
      if (filter.agentWise && filter.agentWise.trim() !== "" && filter.agentWise !== 'all') {
        const agentExists = agents.some(
          agent => agent._id.toString() === filter.agentWise!.toString()
        );
    
        if (!agentExists) {
          console.error("Invalid agent selection. Agent ID in filter:", filter.agentWise);
          throw new Error('Selected agent does not belong to this superAgent');
        }
        query.agent = filter.agentWise;
        console.log("Query filtering on single agent:", query.agent);
      } else {
        query.agent = { $in: agents.map(agent => agent._id) };
        console.log("Query filtering on all agents:", query.agent);
      }
      query.paymentStatus = "completed";
    
      // 3. Get bookings
      const bookings = await Booking.find(query);
      console.log("Bookings for earnings:", bookings);
    
      // 4. Calculate total earnings as sum of commission (booking.totalAmount * commissionRate/100)
      const totalEarnings = bookings.reduce((total, booking) => {
        const agent = agents.find(a => a._id.toString() === booking.agent?.toString());
        const commissionRate = agent?.commissionRate || 0;
        const earningAmount = (booking.totalAmount * commissionRate) / 100;
        return total + earningAmount;
      }, 0);
    
      console.log("Total Earnings:", totalEarnings);
      return totalEarnings;
    
    } catch (error) {
      console.error("Error in listFilteredEarnings:", error);
      throw error;
    }
  }

}

class UserService {
  
  static async createUser(userData:IUser | IOwner | IAgent): Promise<IUserAuthInfo> {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const user = new User({
        ...userData,
        password: hashedPassword,
        otp,
        otpExpiresAt,
        isVerified: false,
      });
      const savedUser = await user.save();
      await this.sendOTPEmail(savedUser.email, otp);
      // // And send OTP via SMS if phone is provided:
      // if (userData.phone) {
      // await this.sendOTPSMS(userData.phone, otp);
      // }
      const token = this.generateOtpToken(savedUser._id.toString(), savedUser.email);
      return { user: savedUser.toObject(), token };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }

  static async createOwner(userData:IOwner): Promise<IUserAuthInfo> {
    try {
      console.log("before creating owner, here is useerData", userData);
      const existingUser = await Owner.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("Owner already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const user = new Owner({
        ...userData,
        password: hashedPassword,
        otp,
        otpExpiresAt,
        isVerified: false,
        yachts: [],
      });
      console.log("before creating owner and before saving owner");
      const savedUser = await user.save();
      console.log("after creating owner and before saving owner");
      await this.sendOTPEmail(savedUser.email, otp);
      const token = this.generateOtpToken(savedUser._id.toString(), savedUser.email);
      return { user: savedUser.toObject(), token };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }

  static async createAgent(userData:IAgent, referralCode?:string): Promise<IUserAuthInfo> {
    try {
    // Check existing user
    const existingUser = await Agent.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("Agent already exists");
    }
    let superAgentId = null;
    console.log("Referral code is here : ", referralCode);
    if (referralCode) {
      // Find and validate superAgent
      const superagent = await SuperAgent.findOne({ referralCode: referralCode });
      if (!superagent) {
        throw new Error("Invalid referral code");
      }
      console.log("Super agent found with referral code : ", superagent._id);
      superAgentId = superagent._id;
      console.log("Super agent name is here : ", superagent.name);
      console.log("Super agent id is here : ", superAgentId);
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create new agent with superAgent reference
    const agent = new Agent({
      ...userData,
      password: hashedPassword,
      otp,
      otpExpiresAt,
      isVerified: false,
      commissionRate: 0,
      isVerifiedByAdmin: "requested",
      ...(superAgentId && { superAgent: superAgentId })
    });
    // Save agent
    console.log("Agent superAgent id is here : ", agent.superAgent);
    const savedAgent = await agent.save();

    // Update superAgent's agents array if exists
    if (superAgentId) {
      await SuperAgent.findByIdAndUpdate(
        superAgentId,
        { $push: { agents: savedAgent._id } }
      );
    }
    // Send OTP and generate token
    await this.sendOTPEmail(savedAgent.email, otp);
    const token = this.generateOtpToken(savedAgent._id.toString(), savedAgent.email);

    return { user: savedAgent.toObject(), token };

  } catch (error) {
    throw new Error((error as Error).message);
  }
  }

  static async createSuperAgent(userData:ISuperAgent): Promise<IUserAuthInfo> {
    try {
      console.log("userData", userData)
      const existingUser = await SuperAgent.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User already exists");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const referralCode = `${userData.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8)}`;
      console.log("referral code", referralCode)
      const superAgent = new SuperAgent({
        ...userData,
        password: hashedPassword,
        otp,
        referralCode,
        otpExpiresAt,
        isVerified: false,
      });
      console.log("superAgent", superAgent)
      superAgent.referralCode = referralCode;
      const savedUser = await superAgent.save();
      console.log("savedUser", savedUser)

      await this.sendOTPEmail(savedUser.email, otp);
      const token = this.generateOtpToken(savedUser._id.toString(), savedUser.email);
      return { user: savedUser.toObject(), token };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }

  static async createAdmin(userData:IAdmin): Promise<IUserAuthInfo> {
    try {
      const existingUser = await Admin.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User already exists");
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const user = new Admin({
        ...userData,
        password: hashedPassword,
        otp,
        otpExpiresAt,
        isVerified: false,
      });
      const savedUser = await user.save();
      await this.sendOTPEmail(savedUser.email, otp);
      const token = this.generateOtpToken(savedUser._id.toString(), savedUser.email);
      return { user: savedUser.toObject(), token };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }
  
  static async validatePassword(email: string, password: string, role :string): Promise<{ token: string; user: any } | null> {
    try {
      const Role = findRoleById(role);
      const user = await (Role as typeof User).findOne({ email });
      if (!user) {
        return null;
      }

      if (!user.isVerified) {
        await this.generateOTP(user._id.toString());
        const token = this.generateOtpToken(user._id.toString(), user.email);
        return { token, user: { email: user.email, redirect: 'verify-otp' } };
      }

      if (user && (await bcrypt.compare(password, user.password))) {
        const token = this.generateToken(user._id.toString(), user.email, user.role);
        const reducedUser = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
        return { token, user: reducedUser };
      }
      return null;
    } catch (error) {
      throw new Error("Error validating password: " + (error as Error).message);
    }
  }

  static generateToken(userId: string, email: string, role: string ): string {
    const payload = { id: userId, email, role };
    try {
      return jwt.sign(payload, process.env.JWT_SECRET as string);
    } catch (error) {
      throw new Error("Error generating token: " + (error as Error).message);
    }
  }

  static generateOtpToken(userId: string, email: string): string {
    const payload = { id: userId, email };
    try {
      return jwt.sign(payload, OTP_JWT_SECRET, {
        expiresIn: "15m",
      });
    } catch (error) {
      throw new Error("Error generating OTP token: " + (error as Error).message);
    }
  }

  static async findUserById(userId: string,role:string): Promise<IUser | null> {
    try {
      const Role = findRoleById(role);
      return await (Role as typeof User || Role as typeof Owner || Role as typeof Agent ).findById(userId);
    } catch (error) {
      throw new Error("Error finding user by ID: " + (error as Error).message);
    }
  }

  static async updateUser(userId: string, userData: Partial<IUser>): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(userId, userData, { new: true });
    } catch (error) {
      throw new Error("Error updating user: " + (error as Error).message);
    }
  }

  static async deleteUser(userId: string): Promise<IUser | null> {
    try {
      return await User.findByIdAndDelete(userId);
    } catch (error) {
      throw new Error("Error deleting user: " + (error as Error).message);
    }
  }

  static async listUsers(): Promise<IUser[]> {
    try {
      return await User.find();
    } catch (error) {
      throw new Error("Error listing users: " + (error as Error).message);
    }
  }

  static async generateOTP(userId: string): Promise<{ message: string }> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const user = await User.findByIdAndUpdate(userId, { otp, otpExpiresAt }, { new: true });

      if (user) {
        await this.sendOTPEmail(user.email, otp);
        return { message: "OTP sent successfully." };
      } else {
        throw new Error("User not found.");
      }
    } catch (error) {
      throw new Error("Error generating OTP: " + (error as Error).message);
    }
  }

  static async verifyOTP(userId: string, otp: string,role:string): Promise<{ message: string }> {
    try {
      const Role = findRoleById(role);
      console.log("role is here : ", role);
      const user = await (Role as typeof User ||  Role as typeof Owner || Role as typeof Agent ||Role as typeof SuperAgent).findById(userId);
      console.log("User is here : ", user);
      if (user && user.otp === otp && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
        await (Role as typeof User ||  Role as typeof Owner || Role as typeof Agent || Role as typeof SuperAgent ).findByIdAndUpdate(userId, { isVerified: true, otp: null, otpExpiresAt: null });
        return { message: 'OTP verified successfully' };
      }
      throw new Error('Invalid or expired OTP');
    } catch (error) {
      throw new Error("Error verifying OTP: " + (error as Error).message);
    }
  }

  static async sendOTPEmail(email: string, otp: string): Promise<void> {
    try {
      const options = {
        subjectLine: 'Your OTP Code',
        contentBody: `Your OTP code is ${otp}. It will expire in 15 minutes.`,
      };
      console.log(options);
      await EmailService.send(email, options);
    } catch (error) {
      throw new Error("Error sending OTP email: " + (error as Error).message);
    }
  }

  static async sendOTPSMS(phone: string, otp: string): Promise<void> {
    try {
      await SMSService.send(phone, otp);
      console.log(`OTP SMS sent successfully to: ${phone}`);
    } catch (error) {
      throw new Error("Error sending OTP SMS: " + (error as Error).message);
    }
  }

  static async forgotPassword(email: string): Promise<{ message: string, token: string }> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("User with this email does not exist.");
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await User.findByIdAndUpdate(user._id, { otp, otpExpiresAt });

      await this.sendOTPEmail(user.email, otp);

      const token = this.generateOtpToken(user._id.toString(), user.email);
      return { message: 'OTP sent for password reset', token };
    } catch (error) {
      throw new Error("Error in forgot password process: " + (error as Error).message);
    }
  }

  static async resetPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await User.findByIdAndUpdate(userId, { password: hashedPassword, otp: null, otpExpiresAt: null });
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new Error("Error resetting password: " + (error as Error).message);
    }
  }

  static async addYachtToOwner(ownerId: string, yachtId: string): Promise<void> {
    try {
      await Owner.findByIdAndUpdate(ownerId, { $push: { yachts: yachtId } });
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }
}

class AdminService {

  // static async createAdminYacht(yachtData: IYacht): Promise<IYacht> {
  //   try {
  //     // Validate owner exists
  //     const owner = await Owner.findById(yachtData.owner);
  //     if (!owner) {
  //       throw new Error("Owner not found");
  //     }

  //     // Create yacht with admin verification
  //     const yacht = new Yacht({
  //       ...yachtData,
  //       isVerifiedByAdmin: 'accepted',
  //       createdAt: new Date(),
  //       updatedAt: new Date()
  //     });

  //     // Save yacht
  //     const savedYacht = await yacht.save();

  //     // Add yacht to owner's list
  //     await Owner.findByIdAndUpdate(
  //       yachtData.owner,
  //       { $push: { yachts: savedYacht._id } }
  //     );

  //     return savedYacht;
  //   } catch (error) {
  //     throw new Error("Error creating yacht: " + (error as Error).message);
  //   }
  // }
  
  static async detailsYatch(yatchId: string): Promise<IYacht | null> {
    try {
      return await Yacht.findById(yatchId);
    } catch (error) {
      throw new Error("Error getting yatch: " + (error as Error).message);
    }
  }

  static async updateAgentProfile(userId: string, userData: Partial<IAgent>): Promise<IAgent | null> {
    try{
      const { age,experience,address,accountHolderName,accountNumber,bankName,ifscCode,imgUrl,commissionRate } = userData;
      return await Agent.findByIdAndUpdate(userId, {
        age,
        experience,
        address,
        accountHolderName,
        accountNumber,
        bankName,
        ifscCode,
        imgUrl,
        commissionRate,
        isVerifiedByAdmin: "accepted"
      }, { new: true });
    }
    catch (error) {
      throw new Error("Error updating user: " + (error as Error).message);
    }
  }

  static async deactivatePromoCode(promoId: string): Promise<IPromo | null> {
    try {
      return await Promo.findByIdAndUpdate(promoId, { isActive: false }, { new: true });
    } catch (error) {
      throw new Error("Error deactivating promo code: " + (error as Error).message);
    }
  }

  static async updateSuperAgentProfile(userId: string, userData: Partial<ISuperAgent>): Promise<ISuperAgent | null> {
    try {
      const { age,experience,address,accountHolderName,accountNumber,bankName,ifscCode,imgUrl,commissionRate } = userData;
      return await SuperAgent.findByIdAndUpdate(userId, {
        age,
        experience,
        address,
        accountHolderName,
        accountNumber,
        bankName,
        ifscCode,
        commissionRate,
        isVerifiedByAdmin: "accepted",
        imgUrl
      }, { new: true });
    } catch (error) {
      throw new Error("Error updating user: " + (error as Error).message);
    }
  }

  static async getAllPromoCodes(): Promise<IPromo[]> {
    try {
      return await Promo.find();
    } catch (error) {
      throw new Error("Error listing promo codes: " + (error as Error).message);
    }
  }

  static async getAllYatchs(): Promise<IUser[]> {
    try {
      return await Yacht.find();
    } catch (error) {
      throw new Error("Error listing users: " + (error as Error).message);
    }
  }
  
  static async generatePromoCode(promoData: IPromo): Promise<IPromo> {
    try {
      // Validate promo code format
      if (!/^[A-Z0-9]{6,12}$/.test(promoData.code)) {
        throw new Error("Invalid promo code format");
      }
  
      // Validate discount value
      if (promoData.discountType === "PERCENTAGE" && (promoData.discountValue <= 0 || promoData.discountValue > 100)) {
        throw new Error("Percentage discount must be between 0 and 100");
      }
  
      // Check if promo code already exists
      const existingPromo = await Promo.findOne({ code: promoData.code });
      if (existingPromo) {
        throw new Error("Promo code already exists");
      }
      
      // If promo is valid for "all", remove targetedUsers property so it doesn't trigger validation errors.
      if (promoData.validFor === "all") {
        delete promoData.targetedUsers;
      }
  
      // Create new promo code
      const newPromoCode = new Promo({
        ...promoData,
        isActive: true,
        createdAt: new Date()
      });
  
      return await newPromoCode.save();
    } catch (error) {
      throw new Error("Error generating promo code: " + (error as Error).message);
    }
  }

  static async isApprovedAgent(updateDetails : agentCommission): Promise<IAgent | null> {
    try {
      if(updateDetails.agentId === undefined || updateDetails.agentCommission === undefined){
        throw new Error("Agent ID and Commission rate is required");
      }
      const agent = await Agent.findByIdAndUpdate(updateDetails.agentId, {
        commissionRate: updateDetails.agentCommission,
        isVerifiedByAdmin:updateDetails.approved
       }, { new: true });
      return agent;
    } catch (error) {
      throw new Error("Error updating agent: " + (error as Error).message);
    }
  }

  static async deleteYatch(yatchId: string): Promise<IYacht | null> {
    try {
      return await Yacht.findByIdAndDelete(yatchId);
    } catch (error) {
      throw new Error("Error deleting yatch: " + (error as Error).message);
    }
  }

  static async updateAgentComission(updateDetails:Partial<agentCommission>): Promise<IAgent | null> {
    try {
      return await Agent.findByIdAndUpdate(updateDetails.agentId, { commissionRate : updateDetails.agentCommission }, { new: true });
    }
    catch (error) {
      throw new Error("Error updating agent: " + (error as Error).message);
    }
  }

  static async updateSuperAgentComission(updateDetails:Partial<superAgentCommission>): Promise<ISuperAgent | null> {
    try {
      return await SuperAgent.findByIdAndUpdate(updateDetails.superAgentId, { commissionRate : updateDetails.agentCommission }, { new: true });
    }
    catch (error) {
      throw new Error("Error updating agent: " + (error as Error).message);
    }
  }

  static async superAgentDetail(superAgentId: string): Promise<ISuperAgent | null> {
    try {
      return await SuperAgent.findById(superAgentId);
    } catch (error) {
      throw new Error("Error getting super agent: " + (error as Error).message);
    }
  }

  static async isApprovedSuperAgent(updateDetails : superAgentCommission): Promise<ISuperAgent | null> {
    try {
      if(updateDetails.superAgentId === undefined || updateDetails.agentCommission === undefined){
        throw new Error("Agent ID and Commission rate is required");
      }
      const superAgent = await SuperAgent.findByIdAndUpdate(updateDetails.superAgentId, {
        commissionRate: updateDetails.agentCommission,
        isVerifiedByAdmin:updateDetails.approved
       }, { new: true });
       console.log("superAgent after update is here :", superAgent);
      return superAgent;
    } catch (error) {
      throw new Error("Error updating agent: " + (error as Error).message);
    } 
  }

   static async getAllOwners(): Promise<IOwner[]> {
    try {
      return await Owner.find();
    } catch (error) {
      throw new Error("Error listing owners: " + (error as Error).message);
    }
  }

  static async getAllCustomers(): Promise<IUser[]> {
    try {
      return await User.find();
    } catch (error) {
      throw new Error("Error listing customers: " + (error as Error).message);
    }
  }

  static async getAllBookings(): Promise<IBooking[]> {
    try {
      return await Booking.find();
    } catch (error) {
      throw new Error("Error listing bookings: " + (error as Error).message);
    }
  }

  static async getAllQueries(): Promise<IUser[]> {
    try {
      return await Query.find();
    } catch (error) {
      throw new Error("Error listing queries: " + (error as Error).message);
    }
  }

  static async sendQueryResponseEmail(
    id: string,
    email: string,
    name: string,
    query: string,
    queryAnswer: string
  ): Promise<void> {
    try {
      const senderEmail = process.env.SENDER_EMAIL;
      
      // Build the email content (HTML version)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                background-color: #ffffff;
                padding: 20px;
                margin: 20px auto;
                max-width: 600px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
              .header {
                text-align: center;
                background-color: #007bff;
                color: #ffffff;
                padding: 10px;
                border-radius: 5px 5px 0 0;
              }
              .content {
                padding: 20px;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #777;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Waterz Goa</h2>
              </div>
              <div class="content">
                <p>Dear ${name},</p>
                <p>Thank you for reaching out with your query:</p>
                <blockquote style="border-left: 4px solid #007bff; padding-left: 10px;">${query}</blockquote>
                <p>Response:</p>
                <blockquote style="border-left: 4px solid #28a745; padding-left: 10px;">${queryAnswer}</blockquote>
                <p>We hope this answers your question. If you have any further questions, please feel free to reply to this email.</p>
                <p>Best regards,<br/>Waterz Goa</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Waterz Goa. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Construct the message object similar to your payment service
      const msg = {
        to: email,
        from: {
          email: senderEmail,
          name: 'Waterz Yacht',
        },
        subject: 'Response to Your Query',
        text: `Dear ${name},\n\nThank you for your query:\n\n${query}\n\nResponse:\n\n${queryAnswer}\n\nBest regards,\nYour Company Name`,
        html: htmlContent,
      };

      // Send the email
      // @ts-ignore
      await sgMail.send(msg);
      console.log('Query response email sent successfully to:', email);
      
      // Update the Query document with the response
      await Query.findByIdAndUpdate(id, { messageResponse: queryAnswer });
      console.log('Query document updated with the response.');
    } catch (error) {
      console.error('Error in sendQueryResponseEmail:', (error as Error).message);
      throw new Error("Error sending query response email: " + (error as Error).message);
    }
  }

  static async getAllPayments(): Promise<IUser[]> {
    try {
      return await User.find();
    } catch (error) {
      throw new Error("Error listing payments: " + (error as Error).message);
    }
  }

  static async getAllSuperAgents(): Promise<IUser[]> {
    try {
      return await SuperAgent.find();
    } catch (error) {
      throw new Error("Error listing super agents: " + (error as Error).message);
    }
  }

  static async getAllAgents(): Promise<IUser[]> {
    try {
      return await Agent.find();
    } catch (error) {
      throw new Error("Error listing agents: " + (error as Error).message);
    }
  }

  static async getAllAdmins(): Promise<IAdmin[]> {
    try {
      return await Admin.find();
    } catch (error) {
      throw new Error("Error listing admins: " + (error as Error).message);
    }
  }

  static async updatePricing(yachtId: string, updateDetails: Partial<ApprovedDetails>): Promise<IYacht | null> {
    try {
      const updateQuery = {
        $set: {
          'price.sailing.peakTime': updateDetails.sailingPeakTimePrice,
          'price.sailing.nonPeakTime': updateDetails.sailingNonPeakTimePrice,
          'price.anchoring.peakTime': updateDetails.anchoringPeakTimePrice,
          'price.anchoring.nonPeakTime': updateDetails.anchoringNonPeakTimePrice
        }
      };
  
      return await Yacht.findByIdAndUpdate(
        yachtId,
        updateQuery,
        { new: true }
      );
    } catch (error) {
      throw new Error("Error updating pricing: " + (error as Error).message);
    }
  }

  static async getAdminById(adminId: string): Promise<IAdmin | null> {
    try {
      return await Admin.findById(adminId);
    } catch (error) {
      throw new Error("Error getting admin: " + (error as Error).message);
    }
  }

  static async getYatchsOwner(YatchId: string): Promise<IOwner | null> {
    try {
      const YachtDetail  = await Yacht.findById(YatchId);
      if (!YachtDetail) {
        throw new Error("Yacht not found");
      }
      const OwnerDetail = await Owner.findById(YachtDetail.owner);
      return OwnerDetail;
    } catch (error) {
      throw new Error("Error getting owner: " + (error as Error).message);
    }
  }

  static async getAllBookingByOwner(ownerId: string): Promise<IBooking[]> {
    try {
      const bookings = await Booking.find({ owner: ownerId });
      return bookings;
    } catch (error) {
      throw new Error("Error getting bookings: " + (error as Error).message);
    }
  }

  static async filterYatchs(filter: AdminFilter): Promise<IYacht[]> {
    try {
      const { status, searchName } = filter;
      let query: any = {};
  
      console.log('Received filters:', { status, searchName });
  
      // Apply status filter
      switch(status) {
        case "all":
          // No filter needed for "All"
          break;
        case "recent":
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          query.createdAt = { $gte: sevenDaysAgo };
          break;
        case "requested":
          query.isVerifiedByAdmin = "requested";
          break;
        case "denied":
          query.isVerifiedByAdmin = "denied";
          break;
        default:
          throw new Error(`Invalid status filter: ${status}`);
      }
  
      // Apply name search if provided and not empty
      if (searchName && searchName.trim()) {
        query.name = { $regex: searchName.trim(), $options: 'i' };
      }
  
      console.log('Final query:', JSON.stringify(query));
  
      const yachts = await Yacht.find(query)
        .sort({ createdAt: -1 })
  
      return yachts;
  
    } catch (error) {
      console.error("Error in filterYatchs:", error);
      throw error;
    }
  }

  static async yatchRequestDetails(yatchId: string): Promise<IYacht | null> {
    try {
      return await Yacht.findById({yatchId, isVerifiedByAdmin: false});
    } catch (error) {
      throw new Error("Error getting yatch details: " + (error as Error).message);
    }
  }

  static async isApprovedYatch(updateDetails:ApprovedDetails,yatchId: string): Promise<IYacht | null> {
    try {
      const { sailingPeakTimePrice, sailingNonPeakTimePrice, anchoringPeakTimePrice, anchoringNonPeakTimePrice,approved } = updateDetails;
      const yatch = await Yacht.findByIdAndUpdate(yatchId,
        { 
          price: {
            sailing: {
              peakTime: sailingPeakTimePrice,
              nonPeakTime: sailingNonPeakTimePrice
            },
            anchoring: {
              peakTime: anchoringPeakTimePrice,
              nonPeakTime: anchoringNonPeakTimePrice
            }
          },
          isVerifiedByAdmin: approved 
        }, { new: true });
        return yatch;
    }
    catch (error) {
      throw new Error("Error verifying yatch: " + (error as Error).message);
    }
  }

  // static async filteredBooking(filter: AdminFilterBooking): Promise<IBooking[]> {
  //   try {
  //     const { status, searchName, bookedBy } = filter;
  //     let query: any = {};
  
  //     console.log('Received filters in filterBooking Function :', { status, searchName, bookedBy });
  
  //     // Apply bookedBy filter
  //     switch(bookedBy) {
  //       case "all":
  //         break;
  //       case "customer":
  //         query.isAgentBooking = false;
  //         break;
  //       case "agent":
  //         query.isAgentBooking = true;
  //         break;
  //       default:
  //         throw new Error(`Invalid bookedBy filter: ${bookedBy}`);
  //     }
  
  //     // Apply status filter
  //     switch(status) {
  //       case "all":
  //         break;
  //       case "upcoming":
  //         query.rideStatus = 'upcoming';
  //         break;
  //       case "previous":
  //         query.rideStatus = 'completed';
  //         break;
  //       default:
  //         throw new Error(`Invalid status filter: ${status}`);
  //     }

  //     query.paymentStatus = "completed";
  
  //       // Then apply search query if provided
  //       if (searchName && searchName.trim()) {
  //         query.$or = [
  //           { customerName: { $regex: searchName.trim(), $options: 'i' } },
  //           { customerEmail: { $regex: searchName.trim(), $options: 'i' } },
  //           { customerPhone: { $regex: searchName.trim(), $options: 'i' } }
  //         ];
  //         }
  
  //     console.log('Final query:', JSON.stringify(query));
  
  //     const bookings = await Booking.find(query)
  //       .sort({ createdAt: -1 })
  
  //     return bookings;
  
  //   } catch (error) {
  //     console.error("Error in filterBooking:", error);
  //     throw error;
  //   }
  // }

  static async getBookingDetails(bookingId: String): Promise<IBooking[]> {
    try {
    // 1. Find the booking by bookingId
    const booking = await Booking.findById(bookingId)
      .populate('agent', 'commissionRate superAgent')
      .lean();

    console.log("booking", booking);

    if (!booking) {
      throw new Error('Booking not found');
    }

    let agentCommission: number | null = null;
    let superAgentCommission: number | null = null;

    // 2. If agent exists, extract commissionRate from Agent
    if (booking.agent) {
      const agent = await Agent.findById(booking.agent)
        .select('commissionRate superAgent')
        .lean();
      
      console.log("agent", agent);

      if (agent && agent.commissionRate) {
        agentCommission = 0.01 * agent.commissionRate * booking.totalAmount;
      }

      // 3. If superAgent exists in Agent, extract commissionRate from SuperAgent
      if (agent && agent.superAgent) {
        const superAgent = await SuperAgent.findById(agent.superAgent)
          .select('commissionRate')
          .lean();

        console.log("superAgent", superAgent);  

        if (superAgent && superAgent.commissionRate) {
          superAgentCommission = 0.01 * superAgent.commissionRate * booking.totalAmount;
        }
      }
    }

    return {
      // @ts-ignore
      booking,
      agentCommission,
      superAgentCommission
    };
    } catch (error) {
      console.error("Error in getBookingDetails:", error);
      throw new Error(`Error in getBookingDetails: ${(error as Error).message}`);
    }
  }

  static async filteredBooking(filter: AdminFilterBooking): Promise<IBooking[]> {
  try {
    const { status, searchName, bookedBy } = filter;
    let query: any = {};

    console.log('Received filters in filterBooking Function :', { status, searchName, bookedBy });

    // Apply bookedBy filter (if set)
    switch(bookedBy) {
      case "all":
        // no restriction on isAgentBooking
        break;
      case "customer":
        query.isAgentBooking = false;
        break;
      case "agent":
        query.isAgentBooking = true;
        break;
      default:
        throw new Error(`Invalid bookedBy filter: ${bookedBy}`);
    }

    // Apply status filter
    switch(status) {
      case "all":
        break;
      case "upcoming":
        query.rideStatus = 'upcoming';
        break;
      case "previous":
        query.rideStatus = 'completed';
        break;
      default:
        throw new Error(`Invalid status filter: ${status}`);
    }

    // Only return bookings with completed payments
    query.paymentStatus = "completed";

    // Then apply searchName filter if provided
    if (searchName && searchName.trim()) {
      const search = searchName.trim();
      // If filter explicitly asks for agent bookings
      if (bookedBy === "agent") {
        // Find matching agents from Agent collection
        const agents = await Agent.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const agentIds = agents.map(a => a._id);

        query.agent = { $in: agentIds };
      } else if (bookedBy === "customer") {
        query.$or = [
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } }
        ];
      } else if (bookedBy === "all") {
        // For all bookings, search among customer fields as well as agent fields.
        const agents = await Agent.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const agentIds = agents.map(a => a._id);

        query.$or = [
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } },
          { agent: { $in: agentIds } }
        ];
      }
    }

    console.log('Final query:', JSON.stringify(query));
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 });

    return bookings;
  } catch (error) {
    console.error("Error in filterBooking:", error);
    throw error;
  }
}
  
  static async filterCustomers(filter: AdminCustomerFilter): Promise<IUser[]> {
    try {
      const { searchQuery, type } = filter;
      let query: any = {};
      
      console.log('Received filters:', { searchQuery, type });
  
      // Apply type filter
      switch(type) {
        case "all":
          break;
        case "withBookings":
          query.bookings = { $exists: true, $not: { $size: 0 } };
          break;
        case "withoutBookings":
          query.bookings = { $size: 0 };
          break;
        default:
          throw new Error(`Invalid filter type: ${type}`);
      }
  
      // Apply name search if provided
      if (searchQuery && searchQuery.trim()) {
        query.name = { $regex: searchQuery.trim(), $options: 'i' };
      }
  
      console.log('Final query:', JSON.stringify(query));
  
      const customers = await User.find(query)
        .sort({ createdAt: -1 });
  
      return customers;
  
    } catch (error) {
      console.error("Error in filterCustomers:", error);
      throw new Error(`Error in filterCustomers: ${(error as Error).message}`);
    }
  }

  static async bookingDetails(bookingId: string): Promise<IBooking | null> {
    try {
      return await Booking.findById(bookingId);
    } catch (error) {
      throw new Error("Error getting booking details: " + (error as Error).message);
    }
  }

  static async deleteCustomer(customerId: string): Promise<IUser | null> {
    try {
      return await User.findByIdAndDelete(customerId);
    } catch (error) {
      throw new Error("Error deleting customer: " + (error as Error).message);
    }
  }

  static async filterAgents(filter: AdminCustomerFilter): Promise<IAgent[]> {
    try {
      const { searchQuery, type } = filter;
      let query: any = {};
      
      console.log('Received filters:', { searchQuery, type });
  
      // Apply type filter
      switch(type) {
        case "all":
          break;
        case "withBookings":
          query.bookings = { $exists: true, $not: { $size: 0 } };
          break;
        case "withoutBookings":
          query.bookings = { $size: 0 };
          break;
        default:
          throw new Error(`Invalid filter type: ${type}`);
      }
  
      // Apply name search if provided
      if (searchQuery && searchQuery.trim()) {
        query.name = { $regex: searchQuery.trim(), $options: 'i' };
      }
  
      console.log('Final query:', JSON.stringify(query));
  
      const agents = await Agent.find(query)
        .sort({ createdAt: -1 });
      return agents;
  
    } catch (error) {
      console.error("Error in filterAgents:", error);
      throw new Error(`Error in filterAgents: ${(error as Error).message}`);
    }
  }

  static async filterSuperAgents(filter: AdminSuperAgentFilter): Promise<ISuperAgent[]> {
    try {
      const { searchQuery } = filter;
      let query: any = {};
      
      console.log('Received filters:', { searchQuery });
  
  
      // Apply name search if provided
      if (searchQuery && searchQuery.trim()) {
        query.name = { $regex: searchQuery.trim(), $options: 'i' };
      }
  
      console.log('Final query:', JSON.stringify(query));
  
      const superAgents = await SuperAgent.find(query)
        .sort({ createdAt: -1 });
  
      return superAgents;
  
    } catch (error) {
      console.error("Error in filterSuperAgents:", error);
      throw new Error(`Error in filterSuperAgents: ${(error as Error).message}`);
    }
  }

  static async filterEarnings(filter: AdminEarningFilter): Promise<{totalBookings: number, totalEarning: number}> {
    try {
      const { period } = filter;
      let dateQuery: any = {};
      
      // Set date range based on period
      const now = new Date();
      switch(period) {
        case "today":
          dateQuery = {
            createdAt: {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lte: new Date(now.setHours(23, 59, 59, 999))
            }
          };
          break;
        case "lastWeek":
          const lastWeek = new Date(now);
          lastWeek.setDate(lastWeek.getDate() - 7);
          dateQuery = {
            createdAt: {
              $gte: lastWeek,
              $lte: now
            }
          };
          break;
        case "lastMonth":
          const lastMonth = new Date(now);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          dateQuery = {
            createdAt: {
              $gte: lastMonth,
              $lte: now
            }
          };
          break;
        case "total":
          // No date filter for total
          break;
        default:
          throw new Error(`Invalid period filter: ${period}`);
      }
  
      // Get completed bookings with payment
      const query = {
        ...dateQuery,
        status: 'confirmed',
        paymentStatus: 'completed'
      };
  
      console.log('Final query:', JSON.stringify(query));
  
      // Aggregate bookings data
      const result = await Booking.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalEarning: { $sum: "$totalAmount" }
          }
        }
      ]);
  
      // Return default values if no bookings found
      if (!result.length) {
        return {
          totalBookings: 0,
          totalEarning: 0
        };
      }
  
      return {
        totalBookings: result[0].totalBookings,
        totalEarning: result[0].totalEarning
      };
  
    } catch (error) {
      console.error("Error in filterEarnings:", error);
      throw new Error(`Error in filterEarnings: ${(error as Error).message}`);
    }
  }
  
  static async adminNavbar(): Promise<{
    today: { count: number; percentageChange: number };
    weekly: { current: number; lastWeek: number; percentageChange: number };
    monthly: { current: number; lastMonth: number; percentageChange: number };
    yearly: { current: number; lastYear: number; percentageChange: number };
  }> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const startofLastToday = new Date(now.setDate(now.getDate() - 1));

      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfLastWeek = new Date(now.setDate(now.getDate() - 7));
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
     
      // Get today's bookings
        const todayBookings = await Booking.countDocuments({
          createdAt: { $gte: startOfToday },
          paymentStatus: 'completed'
        });
        const lastTodayBookings = await Booking.countDocuments({
          createdAt: { $gte: startofLastToday, $lt: startOfToday },
          paymentStatus: 'completed'
        });

      // Get weekly bookings
      const thisWeekBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfWeek },
        paymentStatus: 'completed'

      });
      const lastWeekBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfLastWeek, $lt: startOfWeek },
        paymentStatus: 'completed'
      });
  
      // Get monthly bookings
      const thisMonthBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfMonth },
        paymentStatus: 'completed'
      });
      const lastMonthBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
        paymentStatus: 'completed'
      });
  
      // Get yearly bookings
      const thisYearBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfYear },
        paymentStatus: 'completed'
      });
      const lastYearBookings = await Booking.countDocuments({
        createdAt: { $gte: startOfLastYear, $lt: startOfYear },
        paymentStatus: 'completed'
      });
  
      // Calculate percentage changes
      const daypercentage = ((todayBookings - lastTodayBookings) / lastTodayBookings) * 100 || 0;
      const weeklyPercentage = ((thisWeekBookings - lastWeekBookings) / lastWeekBookings) * 100 || 0;
      const monthlyPercentage = ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 || 0;
      const yearlyPercentage = ((thisYearBookings - lastYearBookings) / lastYearBookings) * 100 || 0;
  
      return {
        today: {
          count: todayBookings,
          percentageChange: Number(daypercentage.toFixed(2))
        },
        weekly: {
          current: thisWeekBookings,
          lastWeek: lastWeekBookings,
          percentageChange: Number(weeklyPercentage.toFixed(2))
        },
        monthly: {
          current: thisMonthBookings,
          lastMonth: lastMonthBookings,
          percentageChange: Number(monthlyPercentage.toFixed(2))
        },
        yearly: {
          current: thisYearBookings,
          lastYear: lastYearBookings,
          percentageChange: Number(yearlyPercentage.toFixed(2))
        }
      };
  
    } catch (error) {
      console.error("Error in adminNavbarDetails:", error);
      throw new Error(`Error in adminNavbarDetails: ${(error as Error).message}`);
    }
  }

static async getAdminDashboard(filters: AdminDashboardFilter): Promise<DashboardResponse> {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
    const currentMonth = new Date().getMonth();

    // Date range helper
    const getDateRange = (view: 'thisYear' | 'thisMonth') => {
      if (view === 'thisYear') {
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        };
      }
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth + 1, 0)
      };
    };

    // Get date ranges
    const bookingRange = getDateRange(filters.bookingdistributionView);
    const earningRange = getDateRange(filters.earningdistributionView);

    // Calculate booking data with paymentStatus filter added
    const bookingData = await Promise.all(
      (filters.bookingView === 'thisYear'
        ? months
        : years.flatMap(year =>
            months.map(month => ({ month, year: year.toString() }))
          )
      ).map(async (monthData) => {
        const monthIndex = typeof monthData === 'string'
          ? months.indexOf(monthData)
          : months.indexOf(monthData.month);
        const year = typeof monthData === 'string'
          ? currentYear
          : parseInt(monthData.year, 10);

        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);

        // Count bookings with completed payment; the isAgentBooking flag determines type
        const [totalBookings, customerBookings, agentBookings] = await Promise.all([
          Booking.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'completed'
          }),
          Booking.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'completed',
            isAgentBooking: false
          }),
          Booking.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'completed',
            isAgentBooking: true
          })
        ]);

        return {
          month: typeof monthData === 'string' ? monthData : `${monthData.month} ${monthData.year}`,
          totalBookings,
          customerBookings,
          agentBookings,
          ...(typeof monthData !== 'string' && { year: monthData.year })
        };
      })
    );

    // Calculate earning data
    const earningData = await Promise.all(
      (filters.earningView === 'thisYear'
        ? months
        : years.flatMap(year =>
            months.map(month => ({ month, year: year.toString() }))
          )
      ).map(async (monthData) => {
        const monthIndex = typeof monthData === 'string'
          ? months.indexOf(monthData)
          : months.indexOf(monthData.month);
        const year = typeof monthData === 'string'
          ? currentYear
          : parseInt(monthData.year, 10);

        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);

        const result = await Booking.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: 'confirmed',
              paymentStatus: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              amount: { $sum: "$totalAmount" }
            }
          }
        ]);

        return {
          month: typeof monthData === 'string' ? monthData : `${monthData.month} ${monthData.year}`,
          amount: result.length ? result[0].amount : 0,
          ...(typeof monthData !== 'string' && { year: monthData.year })
        };
      })
    );

    // Calculate distributions for bookings based on isAgentBooking flag
    const [bookingDist, earningDist] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: bookingRange.start, $lte: bookingRange.end },
            paymentStatus: 'completed'
          }
        },
        {
          $project: {
            // Derive booking type from isAgentBooking flag
            bookingType: { $cond: [ "$isAgentBooking", "agent", "customer" ] }
          }
        },
        {
          $group: {
            _id: "$bookingType",
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: earningRange.start, $lte: earningRange.end },
            paymentStatus: 'completed'
          }
        },
        {
          $project: {
            bookingType: { $cond: [ "$isAgentBooking", "agent", "customer" ] },
            totalAmount: 1
          }
        },
        {
          $group: {
            _id: "$bookingType",
            total: { $sum: "$totalAmount" }
          }
        }
      ])
    ]);

    // Calculate totals from bookingData and earningData
    const totalBookings = bookingData.reduce((sum, item) => sum + item.totalBookings, 0);
    const totalCustomerBookings = bookingData.reduce((sum, item) => sum + item.customerBookings, 0);
    const totalAgentBookings = bookingData.reduce((sum, item) => sum + item.agentBookings, 0);
    const totalEarnings = earningData.reduce((sum, item) => sum + item.amount, 0);

    // Process distribution data safely from aggregations
    const bookingDistObj = bookingDist.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const earningDistObj = earningDist.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {} as Record<string, number>);

    const totalDistBookings = (bookingDistObj.customer || 0) + (bookingDistObj.agent || 0);
    const totalDistEarnings = (earningDistObj.customer || 0) + (earningDistObj.agent || 0);

    const bookingDistribution = {
      customerPercentage: totalDistBookings > 0 ? Number(((bookingDistObj.customer || 0) / totalDistBookings * 100).toFixed(1)) : 0,
      agentPercentage: totalDistBookings > 0 ? Number(((bookingDistObj.agent || 0) / totalDistBookings * 100).toFixed(1)) : 0,
      customerValue: bookingDistObj.customer || 0,
      agentValue: bookingDistObj.agent || 0
    };

    const earningDistribution = {
      customerPercentage: totalDistEarnings > 0 ? Number(((earningDistObj.customer || 0) / totalDistEarnings * 100).toFixed(1)) : 0,
      agentPercentage: totalDistEarnings > 0 ? Number(((earningDistObj.agent || 0) / totalDistEarnings * 100).toFixed(1)) : 0,
      customerValue: earningDistObj.customer || 0,
      agentValue: earningDistObj.agent || 0
    };

    return {
      bookings: {
        data: bookingData,
        total: totalBookings,
        byCustomer: totalCustomerBookings,
        byAgent: totalAgentBookings
      },
      earnings: {
        data: earningData,
        total: totalEarnings
      },
      distribution: {
        bookings: bookingDistribution,
        earnings: earningDistribution
      }
    };

  } catch (error) {
    console.error("Error in getAdminDashboard:", error);
    throw new Error(`Error in getAdminDashboard: ${(error as Error).message}`);
  }
}

static async getAgentPayments(agentId: string): Promise<Payments[]> {
  try {
    // 1. Extract commissionRate and bookings from Agent
    const agent = await Agent.findById(agentId).select('commissionRate bookings');
    if (!agent) {
      throw new Error('Agent not found');
    }
    // console.log("agenttt", agent);
    const { commissionRate, bookings } = agent;
    const safeCommissionRate = commissionRate ?? 0;
    // console.log("rate", commissionRate);
    // console.log("booking", bookings);
    // 2. Find booking data in Booking using booking ids
    const bookingDocs = await Booking.find({ _id: { $in: bookings } })
      .select('totalAmount createdAt isAgentPaid')
      .lean();

    // console.log("bookingDocs", bookingDocs);  

    // 3. Prepare the result array
    const payments: Payments[] = bookingDocs.map(b => ({
      payStatus: b.isAgentPaid,
      bookingId: b._id.toString(),
      bookingDate: b.createdAt,
      commissionAmount: 0.01 * safeCommissionRate * b.totalAmount
    }));

    // console.log("payments", payments);

    return payments;
  } catch (error) {
    console.error("Error in getAgentPayments:", error);
    throw new Error(`Error in getAgentPayments: ${(error as Error).message}`);
  }
}

static async getSuperAgentPayments(superAgentId: string): Promise<Payments[]> {
  try {
    // 1. Extract commissionRate and agents from SuperAgent
    const superAgent = await SuperAgent.findById(superAgentId).select('commissionRate agents');
    if (!superAgent) {
      throw new Error('SuperAgent not found');
    }
    const { commissionRate, agents } = superAgent;
    const safeCommissionRate = commissionRate ?? 0;

    // 2. For each agent, extract their bookings
    const agentDocs = await Agent.find({ _id: { $in: agents } }).select('bookings');
    // @ts-ignore
    const allBookingIds: string[] = agentDocs.flatMap(agent => agent.bookings);

    if (!allBookingIds.length) return [];

    // 3. For each booking, extract isSuperAgentPaid, createdAt, totalAmount
    const bookingDocs = await Booking.find({ _id: { $in: allBookingIds } })
      .select('isSuperAgentPaid createdAt totalAmount')
      .lean();

    // 4. Prepare the result array
    const payments: Payments[] = bookingDocs.map(b => ({
      payStatus: b.isSuperAgentPaid,
      bookingId: b._id.toString(),
      bookingDate: b.createdAt,
      commissionAmount: 0.01 * safeCommissionRate * b.totalAmount
    }));

    return payments;
  } catch (error) {
    console.error("Error in getSuperAgentPayments:", error);
    throw new Error(`Error in getSuperAgentPayments: ${(error as Error).message}`);
  }
}

static async agentPayStatus(bookingId: string): Promise<{ message: string; status: boolean }> {
  try {
    // Find the booking by ID
    const booking = await Booking.findById(bookingId).select('isAgentPaid');
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Toggle the isAgentPaid status
    const newStatus = !booking.isAgentPaid;
    booking.isAgentPaid = newStatus;
    await booking.save();

    return {
      message: `Agent payment status updated successfully.`,
      status: newStatus
    };
  } catch (error) {
    console.error("Error in updatingStatus:", error);
    throw new Error(`Error in updatingStatus: ${(error as Error).message}`);
  }
}

static async superAgentPayStatus(bookingId: string): Promise<{ message: string; status: boolean }> {
  try {
    // Find the booking by ID
    const booking = await Booking.findById(bookingId).select('isSuperAgentPaid');
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Toggle the isAgentPaid status
    const newStatus = !booking.isSuperAgentPaid;
    booking.isSuperAgentPaid = newStatus;
    await booking.save();

    return {
      message: `Agent payment status updated successfully.`,
      status: newStatus
    };
  } catch (error) {
    console.error("Error in updatingStatus:", error);
    throw new Error(`Error in updatingStatus: ${(error as Error).message}`);
  }
}

}
export { UserprofileService, AdminService };
export default UserService;
