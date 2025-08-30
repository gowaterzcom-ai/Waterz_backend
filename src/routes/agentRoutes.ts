import express from "express";
import authenticateToken, { authenticateAgent } from "../middleware/authMiddleware";
import { userController } from "../controllers/userController";
import { YatchController } from "../controllers/yachtController";
import BookingController from "../controllers/bookingController";

const router = express.Router();

router.get("/me", authenticateToken,authenticateAgent, userController.meAgent)
router.get("/current/rides", authenticateToken,authenticateAgent,userController.agentAllCurrentRides)
router.get("/prev/rides", authenticateToken,authenticateAgent,userController.agentAllPreviousRides)
router.get("/rides/:id", authenticateToken,authenticateAgent,userController.agentPrevRidesId)
router.get("/listAll", YatchController.listAll);
router.post("/updateProfile",authenticateToken,authenticateAgent, userController.updateAgentProfile);
// For the below endpoints make sure to show discount price of the yatch by reducing based on discount available for Agent which is set by Admin,
router.get("/yatch-detail/:id",authenticateToken,authenticateAgent, YatchController.detailYatch); 
router.post("/search-Yatch",authenticateToken,authenticateAgent, BookingController.serchIdealYatchs); 
router.post("/create-booking/:id",authenticateToken,authenticateAgent, BookingController.createAgentBooking); 
router.post("/validatePromoCode",authenticateToken,authenticateAgent, BookingController.validatePromocode);
router.get("/me/earnings",authenticateToken,authenticateAgent,YatchController.revenueAgent)
router.get("/topYatch",YatchController.topYatch)
router.post("/booking-slots",authenticateToken, BookingController.getBookingSlots);
// router.post("/create-booking/multiple",authenticateToken,authenticateAgent, BookingController.createAgentBookingWithMultipleYatchs);


export default router;