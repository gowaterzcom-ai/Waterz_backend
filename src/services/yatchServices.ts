import Yacht, { IYacht } from "../models/Yacht";
import Booking from "../models/Booking";
import { Agent } from "../models/User";

interface EarningsAnalytics {
  sevenDaysEarnings: number;
  thirtyDaysEarnings: number;
  totalEarnings: number;
  sevenDaysBookings: any[];
  thirtyDaysBookings: any[];
  allBookings: any[];
}



class YatchService {

    static async detailsYatch(id: string): Promise<IYacht | null> {
        try {
          return await Yacht.findById(id);
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async listAll(): Promise<IYacht[]> {
        try {
          return await Yacht.find(
            { isVerifiedByAdmin: "accepted" }
          );
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async revenue(owner: string): Promise<EarningsAnalytics> {
        try {
        // Get all yachts owned by this owner
        const yachts = await Yacht.find({ owner });
        const yachtIds = yachts.map(yacht => yacht._id);

        const allBookings = await Booking.find({
          yacht: { $in: yachtIds },
          paymentStatus : "completed"
        }).populate('yacht');

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
        const sevenDaysBookings = allBookings.filter(booking => 
          //@ts-ignore
          booking.createdAt >= sevenDaysAgo
        );
        
        const thirtyDaysBookings = allBookings.filter(booking => 
          //@ts-ignore
          booking.createdAt >= thirtyDaysAgo
        );
    
        return {
          sevenDaysEarnings: sevenDaysBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
          thirtyDaysEarnings: thirtyDaysBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
          totalEarnings: allBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
          sevenDaysBookings,
          thirtyDaysBookings,  
          allBookings
        };

        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async topYatch(): Promise<IYacht[]> {
        try {
            const yachts = await Yacht.aggregate([
                {
                    $match: {
                        isVerifiedByAdmin: "accepted"
                    }
                },
                {
                    $lookup: {
                        from: "reviews",
                        localField: "_id",
                        foreignField: "yacht",
                        as: "reviews"
                    }
                },
                {
                    $lookup: {
                        from: "bookings",
                        localField: "_id",
                        foreignField: "yacht",
                        as: "bookings"
                    }
                },
                {
                    $addFields: {
                        averageRating: { $avg: "$reviews.rating" },
                        bookingCount: { $size: "$bookings" }
                    }
                },
                {
                    $sort: {
                        averageRating: -1,
                        bookingCount: -1
                    }
                }
            ]);
            return yachts;
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }

    static async createYatch(yatchDtails:IYacht,availabilityFrom:string,availabilityTo:string): Promise<{yachtId : string}> {
      try {
        const yatch = new Yacht({
            ...yatchDtails,
            availabilityFrom,
            availabilityTo,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        console.log("Yatch details will be save :", yatch);
        const newYatch = await yatch.save();
        const yachtId = newYatch._id.toString();
        console.log(yachtId);
        return {yachtId};
      } catch (error) {
        throw new Error((error as Error).message);
      }
    }
    
    static async updateYatch(id: string, detail: Partial<IYacht>): Promise<IYacht | null> {
        try {
          const updatedYatch = await Yacht.findByIdAndUpdate(id, { ...detail, updatedAt: new Date() }, { new: true });
          return updatedYatch;
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async deleteYatch(id: string): Promise<IYacht | null> {
        try {
          const deletedYatch = await Yacht.findByIdAndDelete(id);
          return deletedYatch;
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }
    
    static async updateDetail(): Promise<void> {
        try {
          // Implement logic to update details
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async findYachtsByOwner(owner: string): Promise<IYacht[]> {
        try {
          return await Yacht.find({ owner : owner });
        } catch (error) {
          throw new Error((error as Error).message);
        }
    }

    static async revenueAgent(agentId: string): Promise<EarningsAnalytics> {
      try {
        // Find all bookings for this agent with completed payment
        const allBookings = await Booking.find({
          agent: agentId,
          paymentStatus: "completed"
        }).populate('yacht');

        // console.log("allbookings", allBookings);

        const agent =await Agent.findById(agentId);
        if (!agent) {
          throw new Error("Agent not found");
        }
        // console.log("agent", agent);
        
        const commission = agent?.commissionRate || 0;
        const commissionRate = commission / 100; // Convert to decimal for calculations
        // console.log("commission", commission/100);
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Filter bookings for last 7 & 30 days
        const sevenDaysBookings = allBookings.filter(booking =>
          //@ts-ignore
          booking.createdAt >= sevenDaysAgo
        );

        // console.log("sevenDaysBookings", sevenDaysBookings);
        const thirtyDaysBookings = allBookings.filter(booking =>
          //@ts-ignore
          booking.createdAt >= thirtyDaysAgo
        );
        
        // Calculate earnings over the defined periods
        const sevenDaysEarnings = sevenDaysBookings.reduce((sum, booking) => sum + booking.totalAmount*commissionRate, 0);
        const thirtyDaysEarnings = thirtyDaysBookings.reduce((sum, booking) => sum + booking.totalAmount*commissionRate, 0);
        const totalEarnings = allBookings.reduce((sum, booking) => sum + booking.totalAmount*commissionRate, 0);
        
        return {
          sevenDaysEarnings,
          thirtyDaysEarnings,
          totalEarnings,
          sevenDaysBookings,
          thirtyDaysBookings,
          allBookings
        };
        
      } catch (error) {
        throw new Error((error as Error).message);
      }
    }
  }
export default YatchService;