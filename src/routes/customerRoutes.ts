import express from "express";
import authenticateToken from "../middleware/authMiddleware";
import { userController } from "../controllers/userController";
import { YatchController } from "../controllers/yachtController";
import { authenticateUser } from "../middleware/authMiddleware";
import { BookingController } from "../controllers/bookingController";
import { TaskRouterGrant } from "twilio/lib/jwt/AccessToken";

const router = express.Router();

router.get("/me", authenticateToken,authenticateUser, userController.meCustomer)
router.post("/profile/update", authenticateToken,authenticateUser, userController.updateProfile)
router.get("/current/rides", authenticateToken,authenticateUser,userController.customerAllCurrentRides)
router.get("/prev/rides", authenticateToken,authenticateUser,userController.customerAllPrevRides)
router.get("/rides/:id", authenticateToken,authenticateUser,userController.customerPrevRidesId)
router.get("/yatch-detail/:id",authenticateToken,authenticateUser, YatchController.detailYatch);
router.get("/listAll", YatchController.listAll);
router.post("/create/:id",authenticateToken,authenticateUser, BookingController.createBooking);
router.post("/validatePromoCode",authenticateToken,authenticateUser, BookingController.validatePromocode);
router.post("/idealYatchs", BookingController.serchIdealYatchs);
router.get("/topYatch",YatchController.topYatch);
router.post("/booking-slots",authenticateToken, BookingController.getBookingSlots);

export default router;
