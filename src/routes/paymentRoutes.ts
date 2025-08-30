import express from 'express';
import PaymentController from '../controllers/paymentController';
import authenticateToken from '../middleware/authMiddleware';

const router = express.Router();

router.post('/verify',authenticateToken, PaymentController.verifyPayment);
router.post('/verify-agent-Booking',authenticateToken, PaymentController.verifyPayment);
router.post('/webhook',authenticateToken, PaymentController.handleWebhook);

export default router;