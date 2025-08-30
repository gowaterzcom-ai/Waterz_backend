import { IBooking } from "../models/Booking";
import Yacht, {IYacht} from "../models/Yacht";
import Booking from "../models/Booking";
import Owner, { SuperAgent } from "../models/User";
import User,{ Agent } from "../models/User";
import Razorpay from "razorpay";
import PaymentService from "./paymentService";
import { getEffectivePrice } from "../utils/timeUtils";
import UserService from "./userServices";

interface Role {
  role: "agent" | "customer";
} 
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || (() => { throw new Error("RAZORPAY_KEY_ID is not defined"); })(),
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class BookingService {

    private static getPackageDurationHelper(pkgType: string): { sailingHours: number, anchorageHours: number, totalHours: number } {
      const [sailing, anchoring] = pkgType.split('_hour').map(part => {
        const match = part.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : 0;
      });
      return { sailingHours: sailing, anchorageHours: anchoring, totalHours: sailing + anchoring };
    }

    private static calculateAddonCost(
      yachtDetails: IYacht,
      totalHours: number,
      addonServices?: Array<{ service: string } | string>
    ): number {
      if (!addonServices || addonServices.length === 0) return 0;
      const calculatedAddonPrice = addonServices.reduce((sum, addon) => {
        let serviceName: string;
        console.log(" Total Booking Hours is : ", totalHours);
        // Use totalHours as duration regardless of addon types
        if (typeof addon === 'string') {
          serviceName = addon;
        } else {
          serviceName = addon.service;
        }
        const yachtAddon = yachtDetails.addonServices.find(a => a.service === serviceName);
        return sum + (yachtAddon ? yachtAddon.pricePerHour * 1 : 0);
      }, 0);
      console.log("AddonPrice is here : ", calculatedAddonPrice);
      return calculatedAddonPrice;
    }

    private static calculateGst(totalAmount: number, totalTaxPercentage : number): number {
      // return totalAmount * (totalTaxPercentage / 100);
      return 0
    }

    // static async createBooking(BookingDetails: Partial<IBooking>,role : Role): Promise<{booking: IBooking, orderId: string,totalAmount: number,packageAmount: number, addonCost: number, gstAmount: number }> {
    //   try {
    //     const { 
    //       startDate, 
    //       startTime, 
    //       location, 
    //       packages, 
    //       PeopleNo, 
    //       addonServices, 
    //       user,
    //       promoCode,
    //       yacht 
    //     } = BookingDetails;
  
    //   // Find yacht
    //   console.log("BookingDetails is here : ",BookingDetails)
    //   const yachtDetails = await Yacht.findById(yacht);
    //   if (!yachtDetails) throw new Error("Yacht not found");

    //   const packageType = typeof packages === 'string' ? packages : packages;
    //   if (!packageType) {
    //     throw new Error("Package type is required");
    //   }
  
    //   // Extract sailing and anchoring times from package
    //   const getPackageDuration = (pkgType: string): { sailingHours: number, anchorageHours: number } => {
    //     const [sailing, anchoring] = pkgType.split('_hour').map(part => {
    //       const match = part.match(/(\d+\.?\d*)/);
    //       return match ? parseFloat(match[0]) : 0;
    //     });
    //     return { sailingHours: sailing, anchorageHours: anchoring };
    //   };
    //   const { sailingHours, anchorageHours } = getPackageDuration(packageType);
    //   const totalHours = sailingHours + anchorageHours;
    //   const startDateTime = new Date(`${startDate}T${startTime}`);
    //   const endDateTime = new Date(startDateTime.getTime() + (totalHours * 60 * 60 * 1000));

    //   // Validate capacity
    //   if (PeopleNo && PeopleNo > yachtDetails.capacity) {
    //     throw new Error("Number of people exceeds yacht capacity");
    //   }    
  
    //   // Check availability
    //   const overlappingBookings = await Booking.find({
    //     yacht: yacht,
    //     status: 'confirmed',
    //     $or: [
    //       { startDate: { $lt: endDateTime }, endDate: { $gt: startDateTime } },
    //       { startDate: { $gte: startDateTime, $lt: endDateTime } },
    //       { endDate: { $gt: startDateTime, $lte: endDateTime } }
    //     ]
    //   });
    //   if (overlappingBookings.length > 0) {
    //     throw new Error("The yacht is not available for the selected dates and times");
    //   }

    // // Calculate pricing using effective prices based on IST booking time
    //   const effectiveSailingPrice = getEffectivePrice(yachtDetails, 'sailing', startDateTime);
    //   const effectiveAnchoringPrice = getEffectivePrice(yachtDetails, 'anchoring', startDateTime);


    //   const packageAmount = (sailingHours * effectiveSailingPrice) + (anchorageHours * effectiveAnchoringPrice);
    //   let totalAmount = packageAmount;
    //   console.log("Package Amount using effective prices: ", packageAmount);
      
    //   // Add addon services cost
    //   const addonCost = this.calculateAddonCost(yachtDetails, totalHours, addonServices);
    //   totalAmount += addonCost;
    //   console.log("Total Amount after addon is here : ",totalAmount)

    //   // Add gst cost
    //   const totalTaxPercentage = 18;
    //   const gstAmount = this.calculateGst(totalAmount, totalTaxPercentage);
    //   totalAmount += gstAmount;
    //   console.log("Total Amount after gst is here : ",totalAmount)

  
    //   // Fetch user details
    //   console.log("User is here : ",user)
    //   const userDetails = await User.findById(user);
    //   console.log("UserDetails is here : ",userDetails)
    //   if (!userDetails) throw new Error("User not found");

    //   // Create booking record
    //   const booking = new Booking({
    //     ...BookingDetails,
    //     user,
    //     yacht,
    //     bookingDateTime: new Date(),
    //     location,
    //     packages,
    //     startDate: startDateTime,
    //     startTime: startDateTime,
    //     endDate: endDateTime,
    //     name: yachtDetails.name,
    //     images: yachtDetails.images,
    //     YachtType: yachtDetails.YachtType,
    //     promoCode,
    //     capacity: yachtDetails.capacity,
    //     customerName: userDetails.name,
    //     customerEmail: userDetails.email,
    //     customerPhone: userDetails.phone,
    //     PeopleNo,
    //     isAgentBooking: false,
    //     totalAmount,
    //     addonServices: addonServices || [],
    //     paymentStatus: 'pending',
    //     status: 'confirmed',
    //     calendarSync: true
    //   });

    //     const options = {
    //       amount: totalAmount * 100, 
    //       currency: "INR",
    //       //@ts-ignore
    //       receipt: booking._id.toString(),
    //     };
    //     const order = await razorpay.orders.create(options);
    //     booking.razorpayOrderId = order.id;
    //     await booking.save();
  
    //     await User.findByIdAndUpdate(user, { $push: { bookings: booking._id } });
    //     const owner = yachtDetails.owner;
    //     await Owner.findByIdAndUpdate(owner, { $push: { bookings: booking._id } });
        
    //     return { 
    //       booking,
    //       orderId: order.id,
    //       totalAmount,
    //       packageAmount,
    //       addonCost,
    //       gstAmount
    //     };
  
    //   } catch (error) {
    //     throw new Error((error as Error).message);
    //   }
    // }

    static async createBooking(BookingDetails: Partial<IBooking>, role: Role): Promise<{
      booking: IBooking, 
      orderId: string,
      totalAmount: number,
      packageAmount: number, 
      addonCost: number, 
      gstAmount: number 
    }> {
      try {
        const { 
          startDate, 
          startTime, 
          location, 
          packages, 
          PeopleNo, 
          addonServices, 
          user,
          promoCode,
          yacht 
        } = BookingDetails;
    
        // Helper function to determine timezone offset based on locations
        function getTimezoneOffset(locationStr: string | undefined): { hours: number, minutes: number } {
          // IST is UTC+5:30, GST is UTC+4
          if (locationStr && (locationStr.toLowerCase().includes('mumbai') || locationStr.toLowerCase().includes('goa'))) {
            return { hours: 5, minutes: 30 }; // IST
          } else if (locationStr && locationStr.toLowerCase().includes('dubai')) {
            return { hours: 4, minutes: 0 }; // GST
          } else {
            // Default to IST if location is not specified or recognized
            return { hours: 5, minutes: 30 };
          }
        }
    
        // Find yacht
        console.log("BookingDetails is here : ", BookingDetails);
        const yachtDetails = await Yacht.findById(yacht);
        if (!yachtDetails) throw new Error("Yacht not found");
    
        const packageType = typeof packages === 'string' ? packages : packages;
        if (!packageType) {
          throw new Error("Package is required");
        }
    
        // Extract sailing and anchoring times from package
        const getPackageDuration = (pkgType: string): { sailingHours: number, anchorageHours: number } => {
          const [sailing, anchoring] = pkgType.split('_hour').map(part => {
            const match = part.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[0]) : 0;
          });
          return { sailingHours: sailing, anchorageHours: anchoring };
        };
        
        const { sailingHours, anchorageHours } = getPackageDuration(packageType);
        const totalHours = sailingHours + anchorageHours;
        
        // Convert local time (IST/GST) to UTC based on location
        const { hours: tzHours, minutes: tzMinutes } = getTimezoneOffset(location);
        
        // Parse the input date & time
        // @ts-ignore
        const [year, month, day] = startDate.split('-').map(Number);
        // @ts-ignore
        const [hour, minute] = startTime.split(':').map(Number);
        
        // Create date in UTC by adjusting for the timezone offset
        const startDateTime = new Date(Date.UTC(
          year,
          month - 1, // JavaScript months are 0-indexed
          day,
          hour - tzHours, // Subtract timezone hours to get UTC
          minute - tzMinutes // Subtract timezone minutes to get UTC
        ));
        
        // Calculate end time based on package duration
        const endDateTime = new Date(startDateTime.getTime() + (totalHours * 60 * 60 * 1000));
    
        // Validate capacity
        if (PeopleNo && PeopleNo > yachtDetails.capacity) {
          throw new Error("Number of people exceeds yacht capacity");
        }    
    
        // Check availability
        const overlappingBookings = await Booking.find({
          yacht: yacht,
          status: 'confirmed',
          $or: [
            { startDate: { $lt: endDateTime }, endDate: { $gt: startDateTime } },
            { startDate: { $gte: startDateTime, $lt: endDateTime } },
            { endDate: { $gt: startDateTime, $lte: endDateTime } }
          ]
        });
        
        if (overlappingBookings.length > 0) {
          throw new Error("Yacht not available");
        }
    
        // When calculating effective prices, use the local time for pricing rules
        // Convert UTC startDateTime back to local time for pricing calculations
        const localStartDateTime = new Date(startDateTime.getTime() + (tzHours * 60 + tzMinutes) * 60 * 1000);
        
        // Calculate pricing using effective prices based on local booking time
        const effectiveSailingPrice = getEffectivePrice(yachtDetails, 'sailing', localStartDateTime);
        const effectiveAnchoringPrice = getEffectivePrice(yachtDetails, 'anchoring', localStartDateTime);
    
        const packageAmount = (sailingHours * effectiveSailingPrice) + (anchorageHours * effectiveAnchoringPrice);
        let totalAmount = packageAmount;
        console.log("Package Amount using effective prices: ", packageAmount);
        
        // Add addon services cost
        const addonCost = this.calculateAddonCost(yachtDetails, totalHours, addonServices);
        totalAmount += addonCost;
        console.log("Total Amount after addon is here : ", totalAmount);
    
        // Add gst cost
        const totalTaxPercentage = 28;
        const gstAmount = this.calculateGst(totalAmount, totalTaxPercentage);
        totalAmount += gstAmount;
        console.log("Total Amount after gst is here : ", totalAmount);
    
        // Fetch user details
        console.log("User is here : ", user);
        const userDetails = await User.findById(user);
        console.log("UserDetails is here : ", userDetails);
        if (!userDetails) throw new Error("User not found");
    
        // Create booking record
        const booking = new Booking({
          ...BookingDetails,
          user,
          yacht,
          bookingDateTime: new Date(), // Current time in UTC
          location,
          packages,
          startDate: startDateTime, // UTC time
          startTime: startDateTime, // UTC time
          endDate: endDateTime, // UTC time
          name: yachtDetails.name,
          images: yachtDetails.images,
          YachtType: yachtDetails.YachtType,
          promoCode,
          capacity: yachtDetails.capacity,
          customerName: userDetails.name,
          customerEmail: userDetails.email,
          customerPhone: userDetails.phone,
          PeopleNo,
          isAgentBooking: false,
          isAgentPaid: false,
          isSuperAgentPaid: false,
          totalAmount,
          addonServices: addonServices || [],
          paymentStatus: 'pending',
          status: 'confirmed',
          calendarSync: true,
          // Store timezone information for future reference
          timezone: location && (location.toLowerCase().includes('dubai') ? 'GST' : 'IST')
        });
    
        const options = {
          amount: totalAmount * 100, 
          currency: "INR",
          //@ts-ignore
          receipt: booking._id.toString(),
        };
        
        const order = await razorpay.orders.create(options);
        booking.razorpayOrderId = order.id;
        await booking.save();
    
        await User.findByIdAndUpdate(user, { $push: { bookings: booking._id } });
        const owner = yachtDetails.owner;
        await Owner.findByIdAndUpdate(owner, { $push: { bookings: booking._id } });
        
        return { 
          booking,
          orderId: order.id,
          totalAmount,
          packageAmount,
          addonCost,
          gstAmount
        };
    
      } catch (error) {
        throw new Error((error as Error).message);
      }
    }

    static async searchIdealYachts(searchParams: Partial<IBooking>): Promise<IYacht[]> {
      try {
        const { location, PeopleNo } = searchParams;
    
        // Validate inputs
        // if (!startDate || !startTime) {
        //   throw new Error("Start date, time are required");
        // }
    
        //  Convert packages string to expected format
        // if (!packages) {
        //   throw new Error("Package type is required");
        // }
    
        // Extract sailing and anchoring times from package
        // const getPackageDuration = (pkgType: string): { sailingHours: number, anchorageHours: number } => {
        //   const [sailing, anchoring] = pkgType.split('_hour').map(part => {
        //     const match = part.match(/(\d+\.?\d*)/);
        //     return match ? parseFloat(match[0]) : 0;
        //   });
        //   return { sailingHours: sailing, anchorageHours: anchoring };
        // };
    
      //   const { sailingHours, anchorageHours } = getPackageDuration(packages);
      //   const totalHours = sailingHours + anchorageHours;

      // // Calculate end date and time
      // const startDateTime = new Date(`${startDate}T${startTime}`);
      // const BUFFER_TIME = 30 * 60 * 1000; // 30 min buffer
      // const HOUR_IN_MS = 60 * 60 * 1000;
      // const endDateTime = new Date(startDateTime.getTime() + (totalHours * HOUR_IN_MS) + BUFFER_TIME);

        // Find yachts that match the search criteria
        const yachts = await Yacht.find({
          location,
          // YachtType: YachtType,
          capacity: { $gte: PeopleNo },
          // addonServices: {
          //   $elemMatch: {
          //     service: { 
          //       $in: addonServices?.map(a => a.service) || [] 
          //     }
          //   }
          // }      
        });

        // Filter out yachts that have overlapping bookings
        // const availableYachts = [];
        // for (const yacht of yachts) {
        //   const overlappingBookings = await Booking.find({
        //     yacht: yacht._id,
        //     status: 'confirmed',
        //     $or: [
        //       { startDate: { $lt: endDateTime }, endDate: { $gt: startDateTime } },
        //       { startDate: { $gte: startDateTime, $lt: endDateTime } },
        //       { endDate: { $gt: startDateTime, $lte: endDateTime } }
        //     ]
        //   });

        //   if (overlappingBookings.length === 0) {
        //     availableYachts.push(yacht);
        //   }
        // }

        // return availableYachts;
        return yachts;
      } catch (error) {
        throw new Error(`Yacht search failed: ${(error as Error).message}`);
      }
    }

    static async createAgentBooking(BookingDetails: Partial<IBooking>,role:string): Promise<{booking: IBooking, orderId: string,totalAmount: number,packageAmount: number, addonCost: number, gstAmount: number,yourComission:number}> {
      try {
        const { 
          startDate, 
          startTime, 
          location, 
          packages, 
          PeopleNo, 
          addonServices, 
          user, 
          yacht,
          customerEmail,
          customerName,
          customerPhone
        } = BookingDetails;

    // Helper function to determine timezone offset based on location
    function getTimezoneOffset(locationStr: string | undefined): { hours: number, minutes: number } {
      // IST is UTC+5:30, GST is UTC+4
      if (locationStr && (locationStr.toLowerCase().includes('mumbai') || locationStr.toLowerCase().includes('goa'))) {
        return { hours: 5, minutes: 30 }; // IST
      } else if (locationStr && locationStr.toLowerCase().includes('dubai')) {
        return { hours: 4, minutes: 0 }; // GST
      } else {
        // Default to IST if location is not specified or recognized
        return { hours: 5, minutes: 30 };
      }
    }

    // 1. Find yacht
    const yachtDetails = await Yacht.findById(yacht);
    if (!yachtDetails) throw new Error("Yacht not found");

    const packageType = typeof packages === 'string' ? packages : packages;
    if (!packageType) {
      throw new Error("Package type is required");
    }

    // Extract sailing and anchoring times from package
    const getPackageDuration = (pkgType: string): { sailingHours: number, anchorageHours: number } => {
      const [sailing, anchoring] = pkgType.split('_hour').map(part => {
        const match = part.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : 0;
      });
      return { sailingHours: sailing, anchorageHours: anchoring };
    };
    
    const { sailingHours, anchorageHours } = getPackageDuration(packageType);
    const totalHours = sailingHours + anchorageHours;
    
    // Convert local time (IST/GST) to UTC based on location
    const { hours: tzHours, minutes: tzMinutes } = getTimezoneOffset(location);
    
    // Parse the input date and time
    // @ts-ignore
    const [year, month, day] = startDate.split('-').map(Number);
    // @ts-ignore
    const [hour, minute] = startTime.split(':').map(Number);
    
    // Create date in UTC by adjusting for the timezone offset
    const startDateTime = new Date(Date.UTC(
      year,
      month - 1, // JavaScript months are 0-indexed
      day,
      hour - tzHours, // Subtract timezone hours to get UTC
      minute - tzMinutes // Subtract timezone minutes to get UTC
    ));

    console.log("startDateTime", startDateTime);
    
    // Calculate end time based on package duration
    const endDateTime = new Date(startDateTime.getTime() + (totalHours * 60 * 60 * 1000));

    // 4. Validate capacity
    if (PeopleNo && PeopleNo > yachtDetails.capacity) {
      throw new Error("Number of people exceeds yacht capacity");
    }

    // 5. Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      yacht: yacht,
      status: 'confirmed',
      $or: [
        { startDate: { $lt: endDateTime }, endDate: { $gt: startDateTime } },
        { startDate: { $gte: startDateTime, $lt: endDateTime } },
        { endDate: { $gt: startDateTime, $lte: endDateTime } }
      ]
    });
    if (overlappingBookings.length > 0) {
      throw new Error("Yacht not available");
    }

    // When calculating effective prices, use the local time for pricing rules
    // Convert UTC startDateTime back to local time for pricing calculations
    const localStartDateTime = new Date(startDateTime.getTime() + (tzHours * 60 + tzMinutes) * 60 * 1000);

    // 6 Calculate pricing using effective prices based on IST booking time
    const effectiveSailingPrice = getEffectivePrice(yachtDetails, 'sailing', startDateTime);
    const effectiveAnchoringPrice = getEffectivePrice(yachtDetails, 'anchoring', startDateTime);

    const packageAmount = (sailingHours * effectiveSailingPrice) + (anchorageHours * effectiveAnchoringPrice);
    let totalAmount = packageAmount;
    console.log("Package Amount using effective prices: ", packageAmount);

    // Add addon services cost
    const addonCost = this.calculateAddonCost(yachtDetails, totalHours, addonServices);
    totalAmount += addonCost;
    console.log("Total Amount after addon is here : ", totalAmount);

    // Add GST cost
    const totalTaxPercentage = 28;
    const gstAmount = this.calculateGst(totalAmount, totalTaxPercentage);
    totalAmount += gstAmount;
    console.log("Total Amount after gst and before Agent comission is here : ", totalAmount);
    
    // 7. Apply agent discount logic
    const agent = await Agent.findById(user);
    if(agent?.isVerifiedByAdmin !== "accepted") throw new Error("Please contact Admin for your account Verification before booking");
    if (!agent) throw new Error("Agent not found");
    const agentDiscount = agent.commissionRate ?? 0;
    const yourComission = totalAmount * agentDiscount / 100;
    const discountedAmount = totalAmount - (yourComission);
    console.log("Discounted comission of Agents : ", discountedAmount);
    console.log("Total Amount after Agent Discount is : ", discountedAmount);


   
    // 8. Create booking object
    const booking = new Booking({
      ...BookingDetails,
      user,
      yacht,
      bookingDateTime: new Date(),
      location,
      packages,
      startDate: startDateTime,
      startTime: startDateTime,
      endDate: endDateTime,
      YachtType: yachtDetails.YachtType,
      capacity: yachtDetails.capacity,
      PeopleNo,
      name: yachtDetails.name,
      images: yachtDetails.images,
      isAgentBooking: true,
      isAgentPaid: false,
      isSuperAgentPaid: false,
      agent: user,
      totalAmount: totalAmount,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      addonServices: addonServices || [],
      paymentStatus: 'pending',
      status: 'confirmed',
      calendarSync: true,
      // Store timezone information for future reference
      timezone: location && (location.toLowerCase().includes('dubai') ? 'GST' : 'IST')
    });


    const options = {
          amount: totalAmount * 100, 
          currency: "INR",
          //@ts-ignore
          receipt: booking._id.toString(),
    };
    const order = await razorpay.orders.create(options);
    booking.razorpayOrderId = order.id;
    await booking.save();
    const Agentdetail = await Agent.findById(user);
    console.log("Agent Details is here : ", Agentdetail);
    const superAgent = Agentdetail?.superAgent;
    console.log("SuperAgent is here : ", superAgent);
    
    const agentUpdate = Agent.findByIdAndUpdate(user, { $push: { bookings: booking._id } });
    if (superAgent) {
      const superAgentUpdate = SuperAgent.findByIdAndUpdate(superAgent, { $push: { bookings: booking._id } });
      console.log("SuperAgent related data is pusher to superAgent ");
      await Promise.all([agentUpdate, superAgentUpdate]);
    } else {
      await agentUpdate;
    }
    const owner = yachtDetails.owner;
    await Owner.findByIdAndUpdate(owner, { $push: { bookings: booking._id } });
        
    return { 
      booking,
      orderId: order.id,
      totalAmount,
      packageAmount,
      addonCost,
      gstAmount,
      yourComission
     };
    } catch (error) {
      throw new Error((error as Error).message);
    }
    }

    static async validatePromocode(
      promoCode: string,
      user: string,
      grandTotal: number,
      bookingId: string,
      role:"customer" | "agent"
    ): Promise<{ discount: number, discountType: string, newTotal: number ,orderId:string}> {
      try {
        const promoResult = await PaymentService.validateAndApplyPromo(promoCode, user, role, grandTotal);
    
        if (promoResult.isValid) {
          const newTotal = grandTotal - promoResult.discount;

            // Create a new Razorpay order with the updated amount
            const newOrder = await razorpay.orders.create({
              amount: newTotal * 100, // Amount in paise
              currency: "INR",
              receipt: bookingId,
            });
          await Booking.findByIdAndUpdate(bookingId, { totalAmount: newTotal, razorpayOrderId: newOrder.id });
          console.log("razorPayId updated and successfully added here is new one : ",newOrder.id)
          return { discount: promoResult.discount, discountType: promoResult.discountType, newTotal, orderId :newOrder.id  };
        }
        throw new Error(promoResult.message);
      } catch (error) {
        throw new Error((error as Error).message);
      }
    }

    static async getBookingTotalandRazorPayId(bookingId: string): Promise<{totalAmount:number,razorpayId:string}> {
      try {
        console.log("getBookingTotal bookingId:", bookingId);
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          console.error("Booking details not found for id:", bookingId);
          throw new Error("Booking details not found");
        }
        const razorpayId =booking.razorpayOrderId || "",
        totalAmount = booking.totalAmount;
        
        return {totalAmount,razorpayId};
      } catch (error) {
        throw new Error((error as Error).message);
      }
    }

    // static async getBookingSlotsForYachtByDate(
    //     yachtId: string,
    //     date: string
    // ): Promise<Array<{ startTime: Date; endTime: Date }>> {
    //   try {
    //     // Retrieve yacht details to get availability times
    //     const yacht = await Yacht.findById(yachtId);
    //     if (!yacht) throw new Error("Yacht not found");
    //     console.log("Reacher here 1")

    //     const { availabilityFrom = "08:00", availabilityTo = "20:00", location } = yacht;
    //     console.log("Reacher here 2")

    //     console.log("Yacht Availability is from : ", availabilityFrom, " to : ", availabilityTo);
    //     const fromDate = new Date(availabilityFrom);
    //     const toDate = new Date(availabilityTo);
    //     const fromHour = fromDate.getHours();
    //     const fromMinute = fromDate.getMinutes();
    //     const toHour = toDate.getHours();
    //     const toMinute = toDate.getMinutes();
    //     console.log("fromHour is here : ", fromHour)
    //     console.log("fromMinute is here : ", fromMinute)
    //     console.log("toHour is here : ", toHour)
    //     console.log("toMinute is here : ", toMinute)

    //     console.log("Reacher here 3")
    //     const timezoneOffset = (location && location.toLowerCase().includes('dubai'))
    //       ? { hours: 4, minutes: 0 }
    //       : { hours: 5, minutes: 30 };
    //     console.log("Timezone Offset is here : ", timezoneOffset)
    //     // Ensure the date string is parsed correctly by appending a time
    //     console.log("Reacher here 4")
    //     const localWorkingStart = new Date(`${date}T00:00:00`);
    //     console.log("Reacher here 5")
    //     localWorkingStart.setHours(fromHour, fromMinute, 0, 0);
    //     console.log("Local Working Start is here : ", localWorkingStart)

    //     console.log("Reacher here 6")
    //     const localWorkingEnd = new Date(`${date}T00:00:00`);
    //     console.log("Reacher here 7")
    //     localWorkingEnd.setHours(toHour, toMinute, 0, 0);
    //     console.log("Local Working End is here : ", localWorkingEnd)
    //     console.log("Reacher here 8")
    //     const offsetInMs = ((timezoneOffset.hours * 60) + timezoneOffset.minutes) * 60 * 1000;
    //     console.log("Reacher here 9")
    //     const workingStartUTC = new Date(localWorkingStart.getTime() - offsetInMs);
    //     console.log("Reacher here 10")
    //     console.log("Working Start UTC is here : ", workingStartUTC)
    //     const workingEndUTC = new Date(localWorkingEnd.getTime() - offsetInMs);
    //     console.log("Working End UTC is here : ", workingEndUTC)
    //     console.log("Reacher here 11")
    
    //     console.log("Working Start UTC is here : ", workingStartUTC)
    //     console.log("Working End UTC is here : ", workingEndUTC)

    //     const bookings = await Booking.find({
    //       yacht: yachtId,
    //       paymentStatus: 'confirmed',
    //       startDate: { $gte: workingStartUTC, $lte: workingEndUTC }
    //     })
    //       .sort({ startDate: 1 })
    //       .select('startDate endDate');
    //     console.log("Reacher here 12")
    //     console.log("Bookings are here : ", bookings)
    //     const availableSlots: Array<{ startTime: Date; endTime: Date }> = [];
    //     let slotStart = workingStartUTC;
    //     console.log("Reacher here 13")
    //     for (const booking of bookings) {
    //       if (booking.startDate > slotStart) {
    //         availableSlots.push({
    //           startTime: new Date(slotStart),
    //           endTime: new Date(booking.startDate)
    //         });
    //       }
    //       if (booking.endDate > slotStart) {
    //         slotStart = booking.endDate;
    //       }
    //     }
    //     console.log("Reacher here 14")

    //     if (slotStart < workingEndUTC) {
    //       availableSlots.push({
    //         startTime: new Date(slotStart),
    //         endTime: new Date(workingEndUTC)
    //       });
    //     }
    //     console.log("Reacher here 15")
    //     return availableSlots;
    //   } catch (error) {
    //     throw new Error((error as Error).message);
    //   }
    // }

// static async getBookingSlotsForYachtByDate(
//   yachtId: string,
//   date: string
// ): Promise<Array<{ startTime: Date; endTime: Date }>> {
//   try {
//     // Retrieve yacht details to get availability times
//     const yacht = await Yacht.findById(yachtId);
//     console.log("yacht", yacht);
//     if (!yacht) throw new Error("Yacht not found");
//     console.log("Reacher here 1");

//     const { availabilityFrom = "08:00", availabilityTo = "20:00", location } = yacht;
//     console.log("Reacher here 2");

//     console.log("Yacht Availability is from : ", availabilityFrom, " to : ", availabilityTo);
//     const fromDate = new Date(availabilityFrom);
//     const toDate = new Date(availabilityTo);
//     const fromHour = fromDate.getHours();
//     const fromMinute = fromDate.getMinutes();
//     const toHour = toDate.getHours();
//     const toMinute = toDate.getMinutes();
//     console.log("fromHour is here : ", fromHour);
//     console.log("fromMinute is here : ", fromMinute);
//     console.log("toHour is here : ", toHour);
//     console.log("toMinute is here : ", toMinute);

//     console.log("Reacher here 3");
//     const timezoneOffset = (location && location.toLowerCase().includes('dubai'))
//       ? { hours: 4, minutes: 0 }
//       : { hours: 5, minutes: 30 };
//     console.log("Timezone Offset is here : ", timezoneOffset);

//     console.log("Reacher here 4");
//     const localWorkingStart = new Date(`${date}T00:00:00`);
//     console.log("Reacher here 5");
//     localWorkingStart.setHours(fromHour, fromMinute, 0, 0);
//     console.log("Local Working Start is here : ", localWorkingStart);

//     console.log("Reacher here 6");
//     const localWorkingEnd = new Date(`${date}T00:00:00`);
//     console.log("Reacher here 7");
//     localWorkingEnd.setHours(toHour, toMinute, 0, 0);
//     localWorkingEnd.setHours(toHour, toMinute, 0, 0);
//     // If working end is before (or equal to) working start, assume it is on the next day
//     if (localWorkingEnd <= localWorkingStart) {
//         localWorkingEnd.setDate(localWorkingEnd.getDate() + 1);
//     }
//     console.log("Local Working End is here : ", localWorkingEnd);
//     console.log("Reacher here 8");
//     const offsetInMs = ((timezoneOffset.hours * 60) + timezoneOffset.minutes) * 60 * 1000;
//     console.log("Reacher here 9");
//     const workingStartUTC = new Date(localWorkingStart.getTime() - offsetInMs);
//     console.log("Reacher here 10");
//     console.log("Working Start UTC is here : ", workingStartUTC);
//     const workingEndUTC = new Date(localWorkingEnd.getTime() - offsetInMs);
//     console.log("Working End UTC is here : ", workingEndUTC);
//     console.log("Reacher here 11");

//     // Get all confirmed bookings within this working period
//     const bookings = await Booking.find({
//       yacht: yachtId,
//       paymentStatus: 'confirmed',
//       startDate: { $gte: workingStartUTC, $lte: workingEndUTC }
//     })
//       .sort({ startDate: 1 })
//       .select('startDate endDate');
//     console.log("Reacher here 12");
//     console.log("Bookings are here : ", bookings);

//     // First, build free intervals by excluding booked times.
//     const freeIntervals: Array<{ start: number, end: number }> = [];
//     let currentStart = workingStartUTC.getTime();

//     bookings.forEach(booking => {
//       const bookingStart = booking.startDate.getTime();
//       const bookingEnd = booking.endDate.getTime();
//       if (bookingStart > currentStart) {
//         // There is a free gap from currentStart to bookingStart
//         freeIntervals.push({ start: currentStart, end: bookingStart });
//       }
//       // Advance currentStart beyond the booking if needed
//       if (bookingEnd > currentStart) {
//         currentStart = bookingEnd;
//       }
//     });

//     // Last interval – a free gap from end of last booking until workingEndUTC, if any.
//     if (currentStart < workingEndUTC.getTime()) {
//       freeIntervals.push({ start: currentStart, end: workingEndUTC.getTime() });
//     }

//     // Now split each free interval into fixed duration slots.
//     const slotDurationMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
//     const availableSlots: Array<{ startTime: Date; endTime: Date }> = [];

//     freeIntervals.forEach(interval => {
//       let slotStart = interval.start;
//       while (slotStart + slotDurationMs <= interval.end) {
//         // Add a full slot only if it completely fits in the free interval.
//         availableSlots.push({
//           startTime: new Date(slotStart),
//           endTime: new Date(slotStart + slotDurationMs)
//         });
//         slotStart += slotDurationMs;
//       }
//     });

//     console.log("Reacher here 15");
//     return availableSlots;
//   } catch (error) {
//     throw new Error((error as Error).message);
//   }
// }

// static async getBookingSlotsForYachtByDate(
//   yachtId: string,
//   date: string,
//   totalDuration: number,
// ): Promise<Array<{ startTime: Date; endTime: Date }>> {
//   try {
//     const yacht = await Yacht.findById(yachtId);
//     if (!yacht) throw new Error("Yacht not found");

//     // yacht avaialibility times
//     const availability = [
//       {
//         from: yacht.availabilityFrom || "08:00",
//         to: yacht.availabilityTo || "20:00"
//       }
//     ]

//     console.log("yacht availabilty slot", availability);

//     // 1. Build start‐of‐day and end‐of‐day bounds in UTC
//     const d = new Date(date);
//     const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
//     const endOfDay = new Date(startOfDay);
//     endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
//     // 2. Query
//     const bookings = await Booking.find({
//       yacht: yachtId,
//       startDate: { 
//         $gte: startOfDay, 
//         $lt: endOfDay 
//       },
//       paymentStatus: "completed",
//       rideStatus: "pending",
//     });

//     console.log("bookings", bookings);

//     const bookedSlots: Array<{ from: Date; to: Date }> =
//       bookings
//         .map(b => ({
//           from: b.startDate,  // or b.from—both are the same in your model
//           to:   b.endDate
//         }))
//         // (optional) sort them by from
//         .sort((a, b) => a.from.getTime() - b.from.getTime());
    
//     console.log('bookedSlots', bookedSlots);

//     const availableSlots: Array<{ startTime: Date; endTime: Date }> = [];

//     return availableSlots;
//   } catch (error) {
//     throw new Error((error as Error).message);
//   }
// }

    static async getBookingSlotsForYachtByDate(
      yachtId: string,
      date: string,
      totalDuration: number,
    ): Promise<Array<{ startTime: Date; endTime: Date }>> {
      try {
        const yacht = await Yacht.findById(yachtId);
        if (!yacht) throw new Error("Yacht not found");
    
        // --- 1. Build availability intervals (could be ["HH:mm"] or full ISO strings) ---
        const availabilityRaw = [
          {
            from: yacht.availabilityFrom || "08:00",
            to:   yacht.availabilityTo   || "20:00",
          }
        ];
    
        // Parse the target date once
        const d = new Date(date);
        const year = d.getUTCFullYear(),
              month = d.getUTCMonth(),
              day   = d.getUTCDate();
    
        // assume year, month, day are already in scope
        const parseTime = (t: string): Date => {
          // 1. grab the part after the 'T' if present, otherwise the whole string
          const timePortion = t.includes("T")
            ? t.split("T")[1].split(/[-+Z]/)[0]      // "05:30:00.000" → "05:30:00.000"
            : t;                                     // "08:00"
        
          // 2. pull out hours and minutes (ignore seconds if you don’t need them)
          const [hour, minute] = timePortion.split(":").map(str => parseInt(str, 10));
        
          // 3. build a UTC Date using your requested date + extracted time
          return new Date(Date.UTC(year, month, day, hour, minute));
        };

    
        const availability = availabilityRaw.map(slot => ({
          from: parseTime(slot.from),
          to:   parseTime(slot.to),
        }));

        console.log("Availibility", availability);
    
        // --- 2. Pull in existing bookings for that day, sorted ---
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
        const endOfDay   = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
    
        const bookings = await Booking.find({
          yacht: yachtId,
          startDate: { $gte: startOfDay, $lt: endOfDay },
          paymentStatus: "completed",
          rideStatus:   "pending",
        });
    
        const bookedSlots = bookings
          .map(b => ({ from: b.startDate, to: b.endDate }))
          .sort((a, b) => a.from.getTime() - b.from.getTime());
    
        // --- 3. Slide a totalDuration-hour window in 1h steps, skip overlaps ---
        const msPerHour     = 60 * 60 * 1000;
        const durationMs    = totalDuration * msPerHour;
        const stepMs        = 1 * msPerHour;  // 1-hour increments

        console.log("bookedSlots", bookedSlots);
    
        const availableSlots: Array<{ startTime: Date; endTime: Date }> = [];
    
        for (const slot of availability) {
          let cursor = new Date(slot.from.getTime());
    
          while (cursor.getTime() + durationMs <= slot.to.getTime()) {
            const windowStart = new Date(cursor);
            const windowEnd   = new Date(cursor.getTime() + durationMs);
    
            // overlap test: (start < booked.to) && (end > booked.from)
            const overlaps = bookedSlots.some(b =>
              windowStart < b.to && windowEnd > b.from
            );
    
            if (!overlaps) {
              availableSlots.push({ startTime: windowStart, endTime: windowEnd });
            }
    
            cursor = new Date(cursor.getTime() + stepMs);
          }
        }

        console.log("availableSlots", availableSlots);
    
        return availableSlots;
      } catch (err) {
        throw new Error((err as Error).message);
      }
    }

    static async verifyCustomers(bookingId:string):Promise<{message: string}>{
      try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const booking = await Booking.findByIdAndUpdate(bookingId, { otp }, { new: true });
      console.log("Booking after otp is here : ", booking);
      if (!booking) {
        throw new Error("Booking not found");
      }
       await UserService.sendOTPEmail(booking.customerEmail, otp);
        return { message: "OTP sent successfully." };
     } 
      catch (error) {
        throw new Error("Error generating OTP: " + (error as Error).message);
      }
    }

    static async verifyOTPCustomers(bookingId: string, otp: string,): Promise<{ message: string }> {
        try {
          const booking = await Booking.findById(bookingId);
          if (!booking) {
            throw new Error("Booking not found");
          }
          if (booking.otp !== otp) {
            throw new Error("Invalid OTP");
          } 
          else {
            booking.rideStatus = 'completed';
            await booking.save();
            console.log("Booking after successfully otp verification is here : ", booking);
            return { message: 'OTP verified successfully' };
          }
        }
        catch (error) {
          throw new Error("Error verifying OTP: " + (error as Error).message);
        }
    }   
}

export default BookingService;




