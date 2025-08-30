import { Request, Response } from 'express';
import PaymentService from '../services/paymentService';
import crypto from 'crypto';

class PaymentController {
  static async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentDetails = req.body;
      console.log('Payment details before verify function( controller):', paymentDetails);  
      await PaymentService.verifyPayment(paymentDetails);
      res.status(200).json({ message: 'Payment verified successfully' });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async verifyAgentBookingPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentDetails = req.body;
      await PaymentService.verifyMultipleBookingPayment(paymentDetails);
      res.status(200).json({ message: 'Payment verified successfully' });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }
  
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      const signature = req.headers['x-razorpay-signature'];
      const body = JSON.stringify(req.body);

      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        res.status(400).json({ message: 'Invalid webhook signature' });
      }

      const paymentDetails = req.body.payload.payment.entity;
      await PaymentService.verifyPayment(paymentDetails);
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default PaymentController;