import express from "express";
import authenticateToken, { authenticateAdmin } from "../middleware/authMiddleware";
import { adminController } from "../controllers/userController";
import { YatchController } from "../controllers/yachtController";

const router = express.Router();

router.get("/getAllYatchs", authenticateToken, authenticateAdmin, adminController.getAllYatchs);
router.post("/filtered-yatchs", authenticateToken, authenticateAdmin, adminController.filterYatchs);
router.get("requested/yatch/:yatchId",authenticateToken,authenticateAdmin,adminController.yatchRequestDetails)
router.post("/isApproved/yatch/:yatchId",authenticateToken,authenticateAdmin,adminController.isApprovedYatch)
router.post("/updatePricing", authenticateToken, authenticateAdmin, adminController.updatePricing);
router.post("/filtered-bookings", authenticateToken, authenticateAdmin, adminController.filterBookings);
router.post("/bookingDetails", authenticateToken, authenticateAdmin, adminController.BookingDetails);
router.post("/filtered-customers", authenticateToken, authenticateAdmin, adminController.filterCustomers);
router.delete("/delete-customer/:customerId", authenticateToken, authenticateAdmin, adminController.deleteCustomer);
router.delete("/delete-yatch/:yatchId", authenticateToken, authenticateAdmin, adminController.deleteYatch);
router.post("/filtered-agent", authenticateToken, authenticateAdmin, adminController.filterAgents);
router.post("/updateAgentProfile/:id", authenticateToken, authenticateAdmin, adminController.updateAgentProfile);
router.post("/updateSuperAgentProfile/:id", authenticateToken, authenticateAdmin, adminController.updateSuperAgentProfile);
router.post("/getFilteredSuperAgents", authenticateToken, authenticateAdmin, adminController.filterSuperAgents);
router.post("/filtered-Earning", authenticateToken, authenticateAdmin, adminController.filterEarnings);
router.post("/isApproved/agent",authenticateToken,authenticateAdmin,adminController.isApprovedAgent)
router.post("/update-agent-comission",authenticateToken,authenticateAdmin,adminController.updateAgentComission)
router.post("/isApproved/superAgent",authenticateToken,authenticateAdmin,adminController.isApprovedSuperAgent)
router.post("/update-superAgent-comission",authenticateToken,authenticateAdmin,adminController.updatesuperAgentComission)
router.get("/analytics",authenticateToken,authenticateAdmin, adminController.adminNavbar);
router.post("/getAdminDashboard", authenticateToken, authenticateAdmin, adminController.getAdminDashboard);
router.get("/getAllOwners", authenticateToken, authenticateAdmin, adminController.getAllOwners);
router.get("/getAllCustomers", authenticateToken, authenticateAdmin, adminController.getAllCustomers);
router.post("/getAllBookings", authenticateToken, authenticateAdmin, adminController.getAllBookings);
router.get("/getAllQueries", authenticateToken, authenticateAdmin, adminController.getAllQueries);
router.post("/queryResponse/:id", authenticateToken, authenticateAdmin, adminController.queryResponse);
router.get("/getAllPayments", authenticateToken, authenticateAdmin, adminController.getAllPayments);
router.get("/getAllAgents", authenticateToken, authenticateAdmin, adminController.getAllAgents);
router.get("/getAllPayments", authenticateToken, authenticateAdmin, adminController.getAllPayments);
router.post("/getAllSuperAgents", authenticateToken, authenticateAdmin, adminController.getAllSuperAgents);
router.post("/getAllAgents", authenticateToken, authenticateAdmin, adminController.getAllAgents);
router.post("/getAllPayments", authenticateToken, authenticateAdmin, adminController.getAllPayments);
router.get("/yatchOwner", authenticateToken, authenticateAdmin, adminController.getYatchOwner);
router.get("/owners-Booking", authenticateToken, authenticateAdmin, adminController.getAllBookingByOwner);
router.get("/superAgent-detail/:id", authenticateToken, authenticateAdmin,adminController.superAgentDetail);
router.post("/generate-promo-code", authenticateToken, authenticateAdmin, adminController.createPromoCode);
router.get("/getAllPromoCodes", authenticateToken, authenticateAdmin, adminController.getAllPromoCodes);
router.post("/deactivate-promo-code/:id", authenticateToken, authenticateAdmin, adminController.deactivatePromoCode);
router.get("/getYatchDetail/:id", authenticateToken, authenticateAdmin, adminController.getYatchDetail);
router.get("/topYatch",YatchController.topYatch)
router.post("/createAdminYacht", authenticateToken, authenticateAdmin, adminController.admincreateYatch);
router.get("/account", authenticateToken, authenticateAdmin,adminController.accountDetails);
router.post("/getAgentPayments", authenticateToken, authenticateAdmin, adminController.agentPayments);
router.post("/getSuperAgentPayments", authenticateToken, authenticateAdmin, adminController.superAgentPayments);
router.post("/agentPayStatus", authenticateToken, authenticateAdmin, adminController.agentPayStatus);
router.post("/superAgentPayStatus", authenticateToken, authenticateAdmin, adminController.superAgentPayStatus);
export default router;