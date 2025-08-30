//// filepath: /Users/arbajalam/Documents/Yacht/Waterz_backend/src/services/smsService.ts
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

class SMSService {
  private static client: twilio.Twilio | null = null;

  private static initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment variables");
    }
    this.client = twilio(accountSid, authToken);
  }

  static async send(receiverPhone: string, otp: string): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!fromPhone) {
      throw new Error("TWILIO_PHONE_NUMBER must be set in environment variables");
    }
    try {
      await this.client?.messages.create({
        body: `Your OTP code is ${otp}. It will expire in 15 minutes.`,
        from: fromPhone,
        to: receiverPhone
      });
      console.log(`SMS sent successfully to ${receiverPhone}`);
    } catch (error) {
      console.error('Error sending SMS:', (error as Error).message || error);
      throw error;
    }
  }
}

export default SMSService;