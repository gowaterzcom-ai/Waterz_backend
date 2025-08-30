import crypto from "crypto";
import Booking,{BookingAgent} from "../models/Booking";
import Payment from "../models/Payment";
import { google } from "googleapis";
import sgMail from '@sendgrid/mail';
import dotenv from "dotenv";
import {Promo} from "../models/Promo";
import Yacht from "../models/Yacht";
import {Owner} from "../models/User";
import { Types } from "mongoose";

dotenv.config();
interface PaymentVerificationDetails {
  paymentDetails: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
}

interface MultipleBookingPayment extends PaymentVerificationDetails {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
}
const Razorpay_secret = process.env.RAZORPAY_KEY_SECRET || '';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
// console.log("Google OAuth2 Client initialized", oAuth2Client);

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

class PaymentService {

  static async verifyPayment(data: PaymentVerificationDetails): Promise<void> {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = data.paymentDetails;
console.log( "Payment reached in Payment Service ")
    console.log('Extracted Details:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    const generatedSignature = crypto.createHmac('sha256', Razorpay_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }
    console.log("Signature verified successfully");

    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) {
      throw new Error("Booking not found");
    }
    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';
    await booking.save();
  console.log("Booking updated successfully");
    const payment = new Payment({
      booking: booking._id,
      amount: booking.totalAmount,
      paymentGateway: 'Razorpay',
      transactionId: razorpay_payment_id,
      status: 'completed',
    });

    console.log("Payment object created successfully");
    await payment.save();

    // Fetch user and owner details
    const usermail = booking.customerEmail;
    const yacht = await Yacht.findById(booking.yacht);
    if (!yacht || !yacht.owner) {
      throw new Error("Yacht or yacht owner reference not found");
    }
    const ownerId = yacht.owner.toString(); 

    console.log("Owner ID fetched successfully");

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      throw new Error("Owner not found");
    }

    try {
      await Owner.findByIdAndUpdate(
        ownerId,
        { 
          $push: { 
            bookings: booking._id 
          } 
        },
        { new: true }
      );

      console.log("Owner bookings updated successfully");
    } catch (error) {
      console.error('Error updating owner bookings:', error);
      throw new Error('Failed to update owner bookings');
    }
    const userEmailObject = { email: usermail };

    await PaymentService.createCalendarEvent(userEmailObject,owner,booking);
    console.log("Calendar event created successfully");
    await PaymentService.sendEmailNotification(usermail, booking);
    console.log("Email sent to user successfully");
    await PaymentService.sendEmailNotification(owner!.email, booking);
    console.log("Email sent to owner successfully");
  }

  static async createCalendarEvent(user: any, owner: any, booking: any): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
    const event = {
      summary: `Yacht Booking`,
      location: booking.location,
      start: {
        dateTime: booking.startDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: booking.endDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [
        { email: user.email },
        { email: owner.email }
      ],
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      visibility: 'default',
      transparency: 'opaque',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };
  
    try {
      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
        supportsAttachments: true,
        conferenceDataVersion: 0,
        sendNotifications: true
      });
  
      if (!createdEvent.data.id) {
        throw new Error('Failed to create calendar event');
      }

      // Verify attendee status
      const updatedEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: createdEvent.data.id
      });

      console.log('Event created:', createdEvent.data.htmlLink);
      console.log('Event summary:', createdEvent.data.summary);
      console.log('Attendee status:', updatedEvent.data.attendees);
  
    } catch (error) {
      console.error('Calendar error:', error);
      throw new Error('Unable to create calendar event: ' + (error as Error).message);
    }
  }
  
  static async sendEmailNotification(email: string, booking: any): Promise<void> {
    const senderEmail = process.env.SENDER_EMAIL;

    // Extract required fields and format them
    const details = {
      title: 'Yacht Booking Confirmation',
      event: `${new Date(booking.startDate).toLocaleDateString()} ${new Date(booking.startTime).toLocaleTimeString()}`,
      yachtType: booking.YachtType,
      noOfPeople: booking.PeopleNo,
      paymentStatus: booking.paymentStatus,
    };

    const filteredDetails = Object.entries(details)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">
            ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">
            ${value}
          </td>
        </tr>
      `)
      .join('');

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
            }
            .email-container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            }
            .header {
              background: #007bff;
              color: #ffffff;
              text-align: center;
              padding: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 20px;
            }
            .content h2 {
              color: #007bff;
              margin-top: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            table td, table th {
              padding: 8px;
              border: 1px solid #ddd;
              text-align: left;
            }
            .footer {
              background: #333;
              color: #ffffff;
              text-align: center;
              padding: 10px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Waterz Rentals Goa</h1>
              <p>Yacht Booking Confirmation</p>
            </div>
            <div class="content">
              <h2>Dear Customer,</h2>
              <p>Your booking for the yacht has been confirmed! Here are the details:</p>
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredDetails}
                </tbody>
              </table>
              <p>Thank you for choosing Waterz Rentals Goa. We look forward to providing you with an unforgettable experience!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Waterz Rentals Goa. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const msg = {
      to: email,
      from: {
        email: senderEmail,
        name: 'Waterz Rentals Goa',
      },
      subject: 'Yacht Booking Confirmation',
      text: `Your booking for the yacht has been confirmed.`,
      html: htmlContent,
    };

    try {
      // @ts-ignore
      await sgMail.send(msg);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', (error as Error).message || error);
      throw error;
    }
  }

  static async verifyMultipleBookingPayment(data: MultipleBookingPayment): Promise<void> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data.paymentDetails;

    const generatedSignature = crypto.createHmac('sha256', Razorpay_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    const booking = await BookingAgent.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) throw new Error("Booking not found");

    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';
    await booking.save();

    const payment = new Payment({
      booking: booking._id,
      amount: booking.totalAmount,
      paymentGateway: 'Razorpay',
      transactionId: razorpay_payment_id,
      status: 'completed',
    });
    await payment.save();
    // Get all yacht owners
    
    const yachtOwners = await Promise.all(
      [booking.yachts].map(async (yachtId) => {
        const yacht = await Yacht.findById(yachtId).populate('owner');
        if (!yacht || !yacht.owner) throw new Error(`Owner not found for yacht ${yachtId}`);
        const owner = await Owner.findById(yacht.owner);
        if (!owner) throw new Error(`Owner not found for yacht ${yachtId}`);
        return owner;
      })
    );
    await Promise.all(
      yachtOwners.map(owner => 
        Owner.findByIdAndUpdate(
          owner._id,
          { $push: { bookings: booking._id } },
          { new: true }
        )
      )
    );

    // Create calendar events for each yacht
    await Promise.all(
      yachtOwners.map(owner => 
        PaymentService.createCalendarEvent(
          { email: booking.customerEmail },
          owner,
          booking
        )
      )
    );

        // Send notifications
        await PaymentService.sendCustomerEmailNotification(booking);
        await Promise.all(
          yachtOwners.map(owner => 
            PaymentService.sendEmailNotification(owner.email, booking)
          )
        );
  }

  static async sendCustomerEmailNotification(booking: any): Promise<void> {
        const senderEmail = process.env.SENDER_EMAIL;
    
        const details = {
          bookingId: booking._id,
          event: booking.specialEvent,
          date: `${new Date(booking.startDate).toLocaleDateString()}`,
          time: `${new Date(booking.startTime).toLocaleTimeString()}`,
          duration: `${booking.duration} hrs`,
          location: booking.location,
          totalYachts: booking.yachts.length,
          totalAmount: `₹${booking.totalAmount}`,
          paymentStatus: booking.paymentStatus,
          specialRequest: booking.specialRequest || 'None'
        };
    
        // ... HTML template similar to existing but with customer-specific content ...
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <!-- Same structure as existing email template but with customer-specific content -->
            <!-- Include booking.customerName in greeting -->
            <h2>Dear ${booking.customerName},</h2>
            <!-- Add multiple yacht details -->
          </html>
        `;
    
        const msg = {
          to: booking.customerEmail,
          from: {
            email: senderEmail,
            name: 'Waterz Rentals Goa',
          },
          subject: 'Multiple Yacht Booking Confirmation',
          text: `Your booking for ${booking.yachts.length} yachts has been confirmed.`,
          html: htmlContent,
        };
        try {
          // @ts-ignore
          await sgMail.send(msg);
          console.log('Customer email sent successfully');
        } catch (error) {
          console.error('Error sending customer email:', error);
          throw error;
        }
  }

  static async validateAndApplyPromo(
    promoCode: string,
    userId: string,
    userType: "agent" | "customer"| "all",
    bookingAmount: number
  ): Promise<{
    discountType: "PERCENTAGE" | "FIXED" | "FAILED";
    isValid: boolean;
    discount: number;
    message: string;
  }> {
    try {
      const promo = await Promo.findOne({ code: promoCode, isActive: true });
      
      if (!promo) {
        return { discountType:"FAILED",isValid: false, discount: 0, message: "Invalid promo code" };
      }

      // Convert userId to ObjectId
      const userObjectId = new Types.ObjectId(userId);
  
      // Check expiry
      if (new Date() > promo.expiryDate) {
        return { discountType:"FAILED",isValid: false, discount: 0, message: "Promo code expired" };
      }

      // Check total usage limit
      if (promo.totalUsageCount >= promo.totalUsageLimit) {
        return { discountType:"FAILED",isValid: false, discount: 0, message: "Promo code usage limit reached" };
      }
  
      // Check user type validity
      if (promo.validFor !== "all" && promo.validFor !== userType) {
        return {discountType:"FAILED", isValid: false, discount: 0, message: "Promo not valid for this user type" };
      }
  
      // Check targeted users with ObjectId comparison
      if (promo.targetedUsers?.userIds && promo.targetedUsers.userIds.length > 0) {
        const isTargetedUser = promo.targetedUsers.userIds.some(id => 
          id.equals(userObjectId)
        );
        if (!isTargetedUser) {
          return { discountType:"FAILED",isValid: false, discount: 0, message: "Promo not valid for this user" };
        }
      }
  
      // Check user usage limit with ObjectId comparison
      const userUsage = promo.userUsage.find(u => u.userId.equals(userObjectId));
      if (userUsage?.usageCount && userUsage?.usageCount >= promo.maxUsagePerUser) {
        return {discountType:"FAILED", isValid: false, discount: 0, message: "Usage limit exceeded for this user" };
      }
  
      // Calculate discount
      let discount = promo.discountType === "PERCENTAGE" 
        ? (bookingAmount * promo.discountValue / 100)
        : promo.discountValue;
  
      if (promo.maxDiscountAmount) {
        discount = Math.min(discount, promo.maxDiscountAmount);
      }
  
      // Update usage with atomic operation
      await Promo.findByIdAndUpdate(
        promo._id,
        {
          $inc: { totalUsageCount: 1 },
          $push: {
            userUsage: {
              userId: userObjectId,
              usageCount: 1,
              usedAt: new Date()
            }
          }
        },
        { new: true }
      );
  
      return {
        discountType: promo.discountType,
        isValid: true,
        discount,
        message: "Promo applied successfully"
      };
    } catch (error) {
      console.error('Promo validation error:', error);
      throw new Error("Error validating promo: " + (error as Error).message);
    }
  }

}

export default PaymentService;