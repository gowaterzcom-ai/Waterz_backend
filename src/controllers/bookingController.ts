import { Request, Response } from "express";
import BookingService from "../services/bookingService";
import { PackageType } from "../utils/trip";


export class BookingController {

    static async getTripOptions(req: Request, res: Response): Promise<void> {
        try {
          res.status(200).json({ tripOptions: PackageType });
        } catch (error) {
          res.status(500).json({ message: (error as Error).message });
        }
    }
    
    static async createBooking(req: Request, res: Response): Promise<void> {
        console.log("req body", req.body)
        try {
            const BookingDetails = {
                startDate: req.body.startDate,
                startTime: req.body.startTime,
                location: req.body.location,
                PeopleNo: req.body.PeopleNo,
                packages : req.body.packages,
                addonServices: req.body.addonServices,
                user: req.currentUser!.id,
                promoCode: req.body.promoCode,
                yacht: req.body.yacht,
                YachtType: req.body.YachtType
            }
            const role = req.currentUser!.role;
            // @ts-ignore
            const { booking, orderId,totalAmount,packageAmount,addonCost, gstAmount } = await BookingService.createBooking(BookingDetails,role);
            res.status(201).json({ message: 'Booking created successfully. Please complete the payment.', booking, orderId,totalAmount,packageAmount,addonCost, gstAmount });
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    }

    static async serchIdealYatchs(req: Request, res: Response): Promise<void> {
        console.log("req body", req.body)
        try {
            // const { startDate, startTime, location, YachtType, capacity, PeopleNo, addonServices,packages } = req.body;
            const { location, PeopleNo} = req.body;
            // const filterDeatils = { startDate, startTime, location, YachtType, capacity, PeopleNo, addonServices,packages};
            const filterDeatils = {  location, PeopleNo};
            console.log("filters", filterDeatils)
            const yatches =await BookingService.searchIdealYachts(filterDeatils);
            res.status(200).json({ yatches });
        }
         catch (error) {
            res.status(500).json({ message: (error as Error).message });
    }
    }

    static async createAgentBooking(req: Request, res: Response): Promise<void> {
        try {
            const BookingDetails = {
                startDate: req.body.startDate,
                startTime: req.body.startTime,
                location: req.body.location,
                PeopleNo: req.body.PeopleNo,
                user: req.currentUser!.id,
                yacht: req.params.id,
                packages: req.body.packages,
                addonServices:req.body.addonServices,
                customerName: req.body.customerName,
                customerPhone: req.body.customerPhone,
                customerEmail: req.body.customerEmail
            }
            const role = req.currentUser!.role;
            // @ts-ignore
            const { booking, orderId,totalAmount,packageAmount,addonCost, gstAmount,yourComission } = await BookingService.createAgentBooking(BookingDetails,role);
            res.status(201).json({ message: 'Booking created successfully. Please complete the payment.', booking, orderId,totalAmount,packageAmount,addonCost, gstAmount,yourComission });
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    }

    static async validatePromocode(req: Request, res: Response): Promise<void> {
        try {
            console.log(req.body);
            const promoCode = req.body.coupon.promoCode;
            const bookingId = req.body.coupon.bookingId;
            console.log("promoCode", promoCode)
            console.log("bookingId", bookingId)
            const {totalAmount,razorpayId} = await BookingService.getBookingTotalandRazorPayId(bookingId);
            console.log("grandTotal", totalAmount) 
            const userId = req.currentUser!.id;
            const role = req.currentUser!.role;
            // @ts-ignore
            const { discount,discountType,newTotal,orderId } = await BookingService.validatePromocode(promoCode,userId,totalAmount,bookingId,role);
            res.status(200).json({ discount,discountType,newTotal,orderId });
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    }

    static async getBookingSlots(req: Request, res: Response): Promise<void> {
    try {
      const { yachtId, date, totalDuration } = req.body;
      if (!yachtId || !date || !totalDuration) {
        res.status(400).json({ message: "Missing yachtId or date parameter" });
        return;
      }
      const slots = await BookingService.getBookingSlotsForYachtByDate(
        yachtId as string,
        date as string,
        totalDuration as number
      );
      res.status(200).json(slots);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
    }

    static async verifyCustomer(req: Request, res: Response): Promise<void> {
        try {
            const {bookingId} = req.body;
            if (!bookingId) {   
                res.status(400).json({ message: "Booking ID is required" });
                return;
            }
            const customerDetails = await BookingService.verifyCustomers(bookingId);
            if (customerDetails) {
                res.status(200).json({ message: "Customer details retrieved successfully", customerDetails });
            } else {
                res.status(404).json({ message: "No customer details found for this booking ID" });
            }
        }
        catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    }

    static async vertifyCustomerOtp(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId, otp } = req.body;
            console.log("bookingId", bookingId);
            if (!bookingId || !otp) {
                res.status(400).json({ message: "Booking ID and OTP are required" });
                return;
            }
            const isVerified = await BookingService.verifyOTPCustomers(bookingId, otp);
            if (isVerified) {
                res.status(200).json({ message: "OTP verified successfully" });
            } else {
                res.status(400).json({ message: "Invalid OTP" });
            }
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    }

    // static async createAgentBookingWithMultipleYatchs(req: Request, res: Response): Promise<void> {
    //     try {
    //         const BookingDetails = {
    //             startDate: req.body.startDate,
    //             startTime: req.body.startTime,
    //             location: req.body.location,
    //             PeopleNo: req.body.PeopleNo,
    //             user: req.currentUser.id,
    //             noOfYatchs: req.body.noOfYatchs,
    //             yacht: req.params.id,
    //             customerName: req.body.customerName,
    //             customerPhone: req.body.customerPhone,
    //             customerEmail: req.body.customerEmail
    //         }
    //         const { booking, orderId } = await BookingService.createAgentMultipleBooking(BookingDetails);
    //         res.status(201).json({ message: 'Booking created successfully. Please complete the payment.', booking, orderId });
    //     } catch (error) {
    //         res.status(500).json({ message: (error as Error).message });
    //     }
    // }
}
export default BookingController;